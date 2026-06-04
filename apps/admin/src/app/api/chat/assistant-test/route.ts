/**
 * POST /api/chat/assistant-test
 *
 * Admin-only sandbox to preview assistant replies with live catalog context.
 * Does not write to any inquiry thread.
 */

import {
  assistantReplyLooksUnsafe,
  badRequest,
  buildAssistantSystemPrompt,
  callAssistantCompletion,
  CHAT_ASSISTANT_DEFAULT_MODELS,
  CHAT_ASSISTANT_DEFAULT_NAME,
  CHAT_ASSISTANT_PROVIDER_LABELS,
  CHAT_ASSISTANT_PROVIDERS,
  CHAT_SETTING_DB_KEY_LIST,
  coerceChatSettingValue,
  isAssistantProviderConfigured,
  mergeChatSettingsFromDb,
  normalizeChatAssistantProvider,
  ok,
  parseBody,
  resolveAssistantModelFromSettings,
  sanitizeAssistantReply,
  serverError,
  validateString,
  type ChatAssistantProvider,
  type ChatAssistantRuntimeSettings,
  type ChatSettingsValues,
} from "@store/shared";

import { connectDB, Setting } from "@store/db";

import { requireSession } from "@/lib/api/requireSession";
import { buildAssistantTestContext } from "@/lib/chat/buildAssistantTestContext";

interface TestBody {
  message?: unknown;
  provider?: unknown;
  assistantName?: unknown;
  draft?: Partial<ChatSettingsValues>;
}

function mergeRuntimeSettings(
  saved: ChatSettingsValues,
  draft: Partial<ChatSettingsValues> | undefined,
  assistantNameOverride?: string,
): ChatAssistantRuntimeSettings {
  const merged = { ...saved, ...draft };
  return {
    assistantName:
      assistantNameOverride?.trim().slice(0, 60) || merged.assistantName,
    assistantProvider: merged.assistantProvider,
    assistantModelOpenai: merged.assistantModelOpenai,
    assistantModelGoogle: merged.assistantModelGoogle,
    assistantModelAnthropic: merged.assistantModelAnthropic,
    providerApiKeyOpenai: merged.providerApiKeyOpenai,
    providerApiKeyGoogle: merged.providerApiKeyGoogle,
    providerApiKeyAnthropic: merged.providerApiKeyAnthropic,
    assistantInstructions: merged.assistantInstructions,
    assistantTemperature: merged.assistantTemperature,
    assistantMaxTokens: merged.assistantMaxTokens,
  };
}

export async function POST(request: Request) {
  const { response } = await requireSession("ai_view");
  if (response) {
    return response;
  }

  const parsed = await parseBody<TestBody>(request);
  if (parsed instanceof Response) {
    return parsed;
  }

  const messageResult = validateString(parsed.message, {
    label: "Message",
    min: 2,
    max: 500,
  });
  if (typeof messageResult !== "string") {
    return badRequest(messageResult.error);
  }

  await connectDB();
  const settingsDocs = await Setting.find({ key: { $in: CHAT_SETTING_DB_KEY_LIST } })
    .select({ key: 1, value: 1 })
    .lean<Array<{ key: string; value: unknown }>>();

  const savedSettings = mergeChatSettingsFromDb(settingsDocs);

  const draftRaw =
    parsed.draft && typeof parsed.draft === "object"
      ? (parsed.draft as Record<string, unknown>)
      : {};

  function pickSetting<K extends keyof ChatSettingsValues>(
    field: K,
  ): ChatSettingsValues[K] {
    if (field in draftRaw) {
      const coerced = coerceChatSettingValue(field, draftRaw[field]);
      if (coerced !== null) {
        return coerced;
      }
    }
    return savedSettings[field];
  }

  const mergedSettings: ChatSettingsValues = {
    ...savedSettings,
    assistantModelOpenai: pickSetting("assistantModelOpenai"),
    assistantModelGoogle: pickSetting("assistantModelGoogle"),
    assistantModelAnthropic: pickSetting("assistantModelAnthropic"),
    assistantInstructions: pickSetting("assistantInstructions"),
    assistantTemperature: pickSetting("assistantTemperature"),
    assistantMaxTokens: pickSetting("assistantMaxTokens"),
    assistantProvider: pickSetting("assistantProvider"),
    assistantName: pickSetting("assistantName"),
  };

  const savedProvider = normalizeChatAssistantProvider(
    savedSettings.assistantProvider,
    "openai",
  );

  const providerOverride =
    typeof parsed.provider === "string" &&
    CHAT_ASSISTANT_PROVIDERS.includes(parsed.provider as ChatAssistantProvider)
      ? (parsed.provider as ChatAssistantProvider)
      : savedProvider;

  const testAssistantName =
    typeof parsed.assistantName === "string" && parsed.assistantName.trim()
      ? parsed.assistantName.trim().slice(0, 60)
      : savedSettings.assistantName || CHAT_ASSISTANT_DEFAULT_NAME;

  const runtime = mergeRuntimeSettings(
    mergedSettings,
    undefined,
    testAssistantName,
  );
  runtime.assistantProvider = providerOverride;

  const apiKey =
    providerOverride === "google"
      ? runtime.providerApiKeyGoogle
      : providerOverride === "anthropic"
        ? runtime.providerApiKeyAnthropic
        : runtime.providerApiKeyOpenai;

  if (!isAssistantProviderConfigured(providerOverride, apiKey)) {
    return badRequest(
      `No API key set for ${CHAT_ASSISTANT_PROVIDER_LABELS[providerOverride]}. Add it under Chat settings, or set the matching server environment variable.`,
    );
  }

  const started = Date.now();
  try {
    const context = await buildAssistantTestContext({
      customerMessage: messageResult,
    });
    const system = buildAssistantSystemPrompt(context, runtime.assistantName, {
      instructions: runtime.assistantInstructions,
    });
    const model = resolveAssistantModelFromSettings(providerOverride, runtime);

    const result = await callAssistantCompletion({
      provider: providerOverride,
      model,
      apiKey,
      messages: [
        { role: "system", content: system },
        { role: "user", content: messageResult },
      ],
      temperature: runtime.assistantTemperature,
      maxTokens: runtime.assistantMaxTokens,
    });

    if (!result) {
      return serverError("Assistant request failed. Check server logs and API keys.");
    }

    const sanitized = sanitizeAssistantReply(result.reply);
    const unsafe = assistantReplyLooksUnsafe(sanitized);

    return ok({
      reply: sanitized,
      rawReply: result.reply,
      provider: providerOverride,
      model: result.model,
      defaultModel: CHAT_ASSISTANT_DEFAULT_MODELS[providerOverride],
      latencyMs: Date.now() - started,
      unsafe,
      savedProvider,
    });
  } catch (error) {
    return serverError(
      error instanceof Error ? error.message : "Assistant test failed.",
    );
  }
}
