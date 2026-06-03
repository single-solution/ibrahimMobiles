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
    assistantTrainingNotes: merged.assistantTrainingNotes,
    assistantTemperature: merged.assistantTemperature,
    assistantMaxTokens: merged.assistantMaxTokens,
    assistantHistoryTurns: merged.assistantHistoryTurns,
    assistantCatalogLimit: merged.assistantCatalogLimit,
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
    assistantTrainingNotes: pickSetting("assistantTrainingNotes"),
    assistantTemperature: pickSetting("assistantTemperature"),
    assistantMaxTokens: pickSetting("assistantMaxTokens"),
    assistantHistoryTurns: pickSetting("assistantHistoryTurns"),
    assistantCatalogLimit: pickSetting("assistantCatalogLimit"),
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

  if (!isAssistantProviderConfigured(providerOverride)) {
    return badRequest(
      providerOverride === "google"
        ? "GOOGLE_AI_API_KEY is not set on the server."
        : "OPENAI_API_KEY is not set on the server.",
    );
  }

  const started = Date.now();
  try {
    const context = await buildAssistantTestContext({
      customerMessage: messageResult,
      catalogLimit: runtime.assistantCatalogLimit,
    });
    const system = buildAssistantSystemPrompt(context, runtime.assistantName, {
      trainingNotes: runtime.assistantTrainingNotes,
    });
    const model = resolveAssistantModelFromSettings(providerOverride, runtime);

    const result = await callAssistantCompletion({
      provider: providerOverride,
      model,
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
