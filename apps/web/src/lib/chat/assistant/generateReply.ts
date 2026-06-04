import {
  buildAssistantSystemPrompt,
  callAssistantCompletion,
  isAssistantProviderConfigured,
  normalizeChatAssistantProvider,
  resolveAssistantModelFromSettings,
  type ChatAssistantRuntimeSettings,
  type ChatAssistantProvider,
  logger,
} from "@store/shared";

import { buildAssistantStoreContext } from "@/lib/chat/assistant/storeContext";

export interface AssistantChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateAssistantReplyInput {
  settings: ChatAssistantRuntimeSettings;
  customerMessage: string;
  subjectProductId?: string;
  subjectProductName?: string;
  history: AssistantChatTurn[];
}

export interface GenerateAssistantReplyResult {
  reply: string;
  model: string;
  provider: ChatAssistantProvider;
}

export function isAssistantConfigured(provider?: ChatAssistantProvider): boolean {
  if (provider) {
    return isAssistantProviderConfigured(provider);
  }
  return (
    isAssistantProviderConfigured("openai") ||
    isAssistantProviderConfigured("google")
  );
}

export async function generateAssistantReply(
  input: GenerateAssistantReplyInput,
): Promise<GenerateAssistantReplyResult | null> {
  const provider = normalizeChatAssistantProvider(input.settings.assistantProvider);
  if (!isAssistantProviderConfigured(provider)) {
    return null;
  }

  const model = resolveAssistantModelFromSettings(provider, input.settings);
  const context = await buildAssistantStoreContext({
    customerMessage: input.customerMessage,
    subjectProductId: input.subjectProductId,
    subjectProductName: input.subjectProductName,
    catalogLimit: input.settings.assistantCatalogLimit,
  });

  const system = buildAssistantSystemPrompt(context, input.settings.assistantName, {
    trainingNotes: input.settings.assistantTrainingNotes,
  });
  const recentHistory = input.history.slice(-input.settings.assistantHistoryTurns);

  const messages = [
    { role: "system" as const, content: system },
    ...recentHistory.map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
    { role: "user" as const, content: input.customerMessage },
  ];

  const result = await callAssistantCompletion({
    provider,
    model,
    apiKey: provider === "google" ? input.settings.providerApiKeyGoogle : input.settings.providerApiKeyOpenai,
    messages,
    temperature: input.settings.assistantTemperature,
    maxTokens: input.settings.assistantMaxTokens,
  });
  if (!result) {
    logger.error({ provider, model }, "chat-assistant: provider request failed");
    return null;
  }

  return {
    reply: result.reply,
    model: result.model,
    provider: result.provider,
  };
}
