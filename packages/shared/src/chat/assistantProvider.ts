/**
 * Store chat assistant LLM providers — selectable from admin settings.
 */

export const CHAT_ASSISTANT_PROVIDERS = ["openai", "google"] as const;
export type ChatAssistantProvider = (typeof CHAT_ASSISTANT_PROVIDERS)[number];

export const CHAT_ASSISTANT_PROVIDER_LABELS: Record<ChatAssistantProvider, string> = {
  openai: "OpenAI (GPT-4o mini)",
  google: "Google (Gemini Flash-Lite)",
};

export const CHAT_ASSISTANT_DEFAULT_MODELS: Record<ChatAssistantProvider, string> = {
  openai: "gpt-4o-mini",
  google: "gemini-2.5-flash-lite",
};

export function normalizeChatAssistantProvider(
  value: unknown,
  fallback: ChatAssistantProvider = "openai",
): ChatAssistantProvider {
  return value === "google" || value === "openai" ? value : fallback;
}

export function resolveAssistantModel(
  provider: ChatAssistantProvider,
  modelOverride?: string,
): string {
  const trimmed = modelOverride?.trim();
  if (trimmed) {
    return trimmed.slice(0, 80);
  }
  if (provider === "google") {
    return process.env.GEMINI_CHAT_MODEL?.trim() || CHAT_ASSISTANT_DEFAULT_MODELS.google;
  }
  return process.env.OPENAI_CHAT_MODEL?.trim() || CHAT_ASSISTANT_DEFAULT_MODELS.openai;
}

export function isAssistantProviderConfigured(
  provider: ChatAssistantProvider,
  apiKeyOverride?: string,
): boolean {
  if (apiKeyOverride?.trim()) return true;
  if (provider === "google") {
    return Boolean(process.env.GOOGLE_AI_API_KEY?.trim());
  }
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export interface AssistantChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AssistantCompletionInput {
  provider: ChatAssistantProvider;
  model: string;
  apiKey?: string;
  messages: AssistantChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AssistantCompletionResult {
  reply: string;
  model: string;
  provider: ChatAssistantProvider;
}

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 12_000;

async function callOpenAi(
  model: string,
  apiKeyOverride: string | undefined,
  messages: AssistantChatMessage[],
  options: { temperature: number; maxTokens: number },
  signal?: AbortSignal,
): Promise<string | null> {
  const apiKey = apiKeyOverride?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    }),
    signal,
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content?.trim() ?? null;
}

async function callGemini(
  model: string,
  apiKeyOverride: string | undefined,
  messages: AssistantChatMessage[],
  options: { temperature: number; maxTokens: number },
  signal?: AbortSignal,
): Promise<string | null> {
  const apiKey = apiKeyOverride?.trim() || process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const systemMessage = messages.find((message) => message.role === "system");
  const conversation = messages.filter((message) => message.role !== "system");

  const contents = conversation.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(systemMessage
        ? {
            systemInstruction: {
              parts: [{ text: systemMessage.content }],
            },
          }
        : {}),
      contents,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    }),
    signal,
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
}

export async function callAssistantCompletion(
  input: AssistantCompletionInput,
): Promise<AssistantCompletionResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const signal = input.signal ?? controller.signal;

  try {
    const temperature = input.temperature ?? 0.38;
    const maxTokens = input.maxTokens ?? 500;
    const generation = { temperature, maxTokens };

    const raw =
      input.provider === "google"
        ? await callGemini(input.model, input.apiKey, input.messages, generation, signal)
        : await callOpenAi(input.model, input.apiKey, input.messages, generation, signal);

    if (!raw) {
      return null;
    }

    return {
      reply: raw,
      model: input.model,
      provider: input.provider,
    };
  } finally {
    clearTimeout(timeout);
  }
}
