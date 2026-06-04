import { CHAT_GUEST_MESSAGE_LIMIT } from "./guestLimits";
import { CHAT_ASSISTANT_DEFAULT_NAME } from "./assistantConstants";
import {
  normalizeChatAssistantProvider,
  resolveAssistantModel,
  type ChatAssistantProvider,
} from "./assistantProvider";

/** Default welcome copy for empty inquiry threads (admin-editable via settings). */
export const CHAT_WELCOME_GUEST_DEFAULT =
  "Welcome. You may ask about our products, pricing, grades, or orders. Our support team will be pleased to assist you. You may send up to {limit} messages before signing in to continue.";

export const CHAT_WELCOME_CUSTOMER_DEFAULT =
  "Welcome. You may contact us regarding products, orders, or any enquiry. Our support team will respond at the earliest convenience.";

export interface ChatSettingsValues {
  enabled: boolean;
  assistantEnabled: boolean;
  assistantName: string;
  assistantProvider: ChatAssistantProvider;
  assistantModelOpenai: string;
  assistantModelGoogle: string;
  assistantModelAnthropic: string;
  providerApiKeyOpenai: string;
  providerApiKeyGoogle: string;
  providerApiKeyAnthropic: string;
  assistantInstructions: string;
  assistantTemperature: number;
  assistantMaxTokens: number;
  welcomeMessageGuest: string;
  welcomeMessageCustomer: string;
  liveModeEnabled: boolean;
  websocketUrl: string;
  pollIntervalMsFocused: number;
  pollIntervalMsBlurred: number;
  guestThreadTokenDays: number;
  guestMessageLimit: number;
  attachmentsEnabled: boolean;
}

export const CHAT_SETTING_DEFAULTS: ChatSettingsValues = {
  enabled: true,
  assistantEnabled: true,
  assistantName: CHAT_ASSISTANT_DEFAULT_NAME,
  assistantProvider: "openai",
  assistantModelOpenai: "",
  assistantModelGoogle: "",
  assistantModelAnthropic: "",
  providerApiKeyOpenai: "",
  providerApiKeyGoogle: "",
  providerApiKeyAnthropic: "",
  assistantInstructions: "",
  assistantTemperature: 0.38,
  assistantMaxTokens: 500,
  welcomeMessageGuest: CHAT_WELCOME_GUEST_DEFAULT,
  welcomeMessageCustomer: CHAT_WELCOME_CUSTOMER_DEFAULT,
  liveModeEnabled: false,
  websocketUrl: "",
  pollIntervalMsFocused: 5_000,
  pollIntervalMsBlurred: 30_000,
  guestThreadTokenDays: 90,
  guestMessageLimit: CHAT_GUEST_MESSAGE_LIMIT,
  attachmentsEnabled: false,
};

export type ChatAssistantRuntimeSettings = Pick<
  ChatSettingsValues,
  | "assistantName"
  | "assistantProvider"
  | "assistantModelOpenai"
  | "assistantModelGoogle"
  | "assistantModelAnthropic"
  | "providerApiKeyOpenai"
  | "providerApiKeyGoogle"
  | "providerApiKeyAnthropic"
  | "assistantInstructions"
  | "assistantTemperature"
  | "assistantMaxTokens"
>;

export function resolveAssistantModelFromSettings(
  provider: ChatAssistantProvider,
  settings: Pick<
    ChatSettingsValues,
    "assistantModelOpenai" | "assistantModelGoogle" | "assistantModelAnthropic"
  >,
): string {
  const dbOverride =
    provider === "google"
      ? settings.assistantModelGoogle.trim()
      : provider === "anthropic"
        ? settings.assistantModelAnthropic.trim()
        : settings.assistantModelOpenai.trim();
  return resolveAssistantModel(provider, dbOverride || undefined);
}

export const CHAT_SETTING_KEYS = Object.keys(
  CHAT_SETTING_DEFAULTS,
) as Array<keyof ChatSettingsValues>;

const CHAT_SETTING_DB_KEYS: Record<keyof ChatSettingsValues, string> = {
  enabled: "chat.enabled",
  assistantEnabled: "chat.assistantEnabled",
  assistantName: "chat.assistantName",
  assistantProvider: "chat.assistantProvider",
  assistantModelOpenai: "chat.assistantModelOpenai",
  assistantModelGoogle: "chat.assistantModelGoogle",
  assistantModelAnthropic: "chat.assistantModelAnthropic",
  providerApiKeyOpenai: "chat.providerApiKeyOpenai",
  providerApiKeyGoogle: "chat.providerApiKeyGoogle",
  providerApiKeyAnthropic: "chat.providerApiKeyAnthropic",
  assistantInstructions: "chat.assistantInstructions",
  assistantTemperature: "chat.assistantTemperature",
  assistantMaxTokens: "chat.assistantMaxTokens",
  welcomeMessageGuest: "chat.welcomeMessageGuest",
  welcomeMessageCustomer: "chat.welcomeMessageCustomer",
  liveModeEnabled: "chat.liveModeEnabled",
  websocketUrl: "chat.websocketUrl",
  pollIntervalMsFocused: "chat.pollIntervalMsFocused",
  pollIntervalMsBlurred: "chat.pollIntervalMsBlurred",
  guestThreadTokenDays: "chat.guestThreadTokenDays",
  guestMessageLimit: "chat.guestMessageLimit",
  attachmentsEnabled: "chat.attachmentsEnabled",
};

export const CHAT_SETTING_DB_KEY_LIST = Object.values(CHAT_SETTING_DB_KEYS);

export function toChatSettingKey(field: keyof ChatSettingsValues): string {
  return CHAT_SETTING_DB_KEYS[field];
}

export function fromChatSettingKey(key: string): keyof ChatSettingsValues | null {
  for (const field of CHAT_SETTING_KEYS) {
    if (CHAT_SETTING_DB_KEYS[field] === key) {
      return field;
    }
  }
  return null;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function coerceChatSettingValue<K extends keyof ChatSettingsValues>(
  field: K,
  value: unknown,
): ChatSettingsValues[K] | null {
  switch (field) {
    case "enabled":
    case "assistantEnabled":
    case "liveModeEnabled":
    case "attachmentsEnabled":
      return (typeof value === "boolean" ? value : null) as ChatSettingsValues[K] | null;
    case "assistantName":
      return (
        typeof value === "string"
          ? value.trim().slice(0, 60)
          : null
      ) as ChatSettingsValues[K] | null;
    case "assistantProvider":
      return normalizeChatAssistantProvider(value) as ChatSettingsValues[K];
    case "assistantModelOpenai":
    case "assistantModelGoogle":
    case "assistantModelAnthropic":
      return (
        typeof value === "string" ? value.trim().slice(0, 80) : null
      ) as ChatSettingsValues[K] | null;
    case "providerApiKeyOpenai":
    case "providerApiKeyGoogle":
    case "providerApiKeyAnthropic":
      return (
        typeof value === "string" ? value.trim() : null
      ) as ChatSettingsValues[K] | null;
    case "assistantInstructions":
      return (
        typeof value === "string" ? value.trim().slice(0, 12_000) : null
      ) as ChatSettingsValues[K] | null;
    case "assistantTemperature":
      return (
        typeof value === "number" && Number.isFinite(value)
          ? clampNumber(Math.round(value * 100) / 100, 0, 1)
          : null
      ) as ChatSettingsValues[K] | null;
    case "assistantMaxTokens":
      return (
        typeof value === "number" && Number.isFinite(value)
          ? clampNumber(Math.round(value), 100, 2_000)
          : null
      ) as ChatSettingsValues[K] | null;
    case "welcomeMessageGuest":
    case "welcomeMessageCustomer":
      return (
        typeof value === "string"
          ? value.trim().slice(0, 600)
          : null
      ) as ChatSettingsValues[K] | null;
    case "websocketUrl":
      return (
        typeof value === "string" ? value.trim().slice(0, 500) : null
      ) as ChatSettingsValues[K] | null;
    case "pollIntervalMsFocused":
      return (
        typeof value === "number" && Number.isFinite(value)
          ? clampNumber(Math.round(value), 1_000, 60_000)
          : null
      ) as ChatSettingsValues[K] | null;
    case "pollIntervalMsBlurred":
      return (
        typeof value === "number" && Number.isFinite(value)
          ? clampNumber(Math.round(value), 5_000, 300_000)
          : null
      ) as ChatSettingsValues[K] | null;
    case "guestThreadTokenDays":
      return (
        typeof value === "number" && Number.isFinite(value)
          ? clampNumber(Math.round(value), 1, 365)
          : null
      ) as ChatSettingsValues[K] | null;
    case "guestMessageLimit":
      return (
        typeof value === "number" && Number.isFinite(value)
          ? clampNumber(Math.round(value), 1, 100)
          : null
      ) as ChatSettingsValues[K] | null;
    default:
      return null;
  }
}

function readChatSetting<K extends keyof ChatSettingsValues>(
  map: Map<string, unknown>,
  field: K,
): ChatSettingsValues[K] {
  const coerced = coerceChatSettingValue(field, map.get(toChatSettingKey(field)));
  return (coerced ?? CHAT_SETTING_DEFAULTS[field]) as ChatSettingsValues[K];
}

/** Legacy DB key for instructions, renamed from "training notes". */
const LEGACY_INSTRUCTIONS_DB_KEY = "chat.assistantTrainingNotes";

export function mergeChatSettingsFromDb(
  rows: ReadonlyArray<{ key: string; value: unknown }>,
): ChatSettingsValues {
  const map = new Map(rows.map((row) => [row.key, row.value]));
  // Back-compat: surface a value saved under the old key if the new one is empty.
  if (!map.has("chat.assistantInstructions") && map.has(LEGACY_INSTRUCTIONS_DB_KEY)) {
    map.set("chat.assistantInstructions", map.get(LEGACY_INSTRUCTIONS_DB_KEY));
  }
  return {
    enabled: readChatSetting(map, "enabled"),
    assistantEnabled: readChatSetting(map, "assistantEnabled"),
    assistantName: readChatSetting(map, "assistantName"),
    assistantProvider: readChatSetting(map, "assistantProvider"),
    assistantModelOpenai: readChatSetting(map, "assistantModelOpenai"),
    assistantModelGoogle: readChatSetting(map, "assistantModelGoogle"),
    assistantModelAnthropic: readChatSetting(map, "assistantModelAnthropic"),
    providerApiKeyOpenai: readChatSetting(map, "providerApiKeyOpenai"),
    providerApiKeyGoogle: readChatSetting(map, "providerApiKeyGoogle"),
    providerApiKeyAnthropic: readChatSetting(map, "providerApiKeyAnthropic"),
    assistantInstructions: readChatSetting(map, "assistantInstructions"),
    assistantTemperature: readChatSetting(map, "assistantTemperature"),
    assistantMaxTokens: readChatSetting(map, "assistantMaxTokens"),
    welcomeMessageGuest: readChatSetting(map, "welcomeMessageGuest"),
    welcomeMessageCustomer: readChatSetting(map, "welcomeMessageCustomer"),
    liveModeEnabled: readChatSetting(map, "liveModeEnabled"),
    websocketUrl: readChatSetting(map, "websocketUrl"),
    pollIntervalMsFocused: readChatSetting(map, "pollIntervalMsFocused"),
    pollIntervalMsBlurred: readChatSetting(map, "pollIntervalMsBlurred"),
    guestThreadTokenDays: readChatSetting(map, "guestThreadTokenDays"),
    guestMessageLimit: readChatSetting(map, "guestMessageLimit"),
    attachmentsEnabled: readChatSetting(map, "attachmentsEnabled"),
  };
}

export function resolveChatWelcomeMessage(input: {
  audience: "guest" | "customer";
  settings?: Pick<
    ChatSettingsValues,
    "welcomeMessageGuest" | "welcomeMessageCustomer"
  >;
  guestMessageLimit?: number;
}): string {
  const limit = input.guestMessageLimit ?? CHAT_GUEST_MESSAGE_LIMIT;
  const custom =
    input.audience === "guest"
      ? input.settings?.welcomeMessageGuest?.trim()
      : input.settings?.welcomeMessageCustomer?.trim();

  const template =
    custom ||
    (input.audience === "guest"
      ? CHAT_WELCOME_GUEST_DEFAULT
      : CHAT_WELCOME_CUSTOMER_DEFAULT);

  return template.replaceAll("{limit}", String(limit));
}
