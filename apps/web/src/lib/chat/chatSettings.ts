/**
 * Storefront-facing loader for `chat.*` settings.
 *
 * Returns the subset the storefront widget cares about. Admin tab edits
 * bust the `STOREFRONT_CACHE_TAG` (same convention as SEO + store
 * settings) so toggling `chat.enabled` propagates within one revalidate
 * window even if the 30s TTL hasn't expired yet.
 */

import { unstable_cache } from "next/cache";

import { connectDB, Setting } from "@store/db";

import { STOREFRONT_CACHE_TAG } from "@/lib/storefront/cached";

export interface ChatSettings {
  enabled: boolean;
  liveModeEnabled: boolean;
  websocketUrl: string;
  pollIntervalMsFocused: number;
  pollIntervalMsBlurred: number;
  guestThreadTokenDays: number;
  attachmentsEnabled: boolean;
}

const DEFAULTS: ChatSettings = {
  enabled: true,
  liveModeEnabled: false,
  websocketUrl: "",
  pollIntervalMsFocused: 5_000,
  pollIntervalMsBlurred: 30_000,
  guestThreadTokenDays: 90,
  attachmentsEnabled: false,
};

interface RawSettingDoc {
  key: string;
  value: unknown;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}
function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

const TTL_SECONDS = 30;

const loadChatSettings = unstable_cache(
  async (): Promise<ChatSettings> => {
    await connectDB();
    const docs = await Setting.find({
      key: {
        $in: [
          "chat.enabled",
          "chat.liveModeEnabled",
          "chat.websocketUrl",
          "chat.pollIntervalMsFocused",
          "chat.pollIntervalMsBlurred",
          "chat.guestThreadTokenDays",
          "chat.attachmentsEnabled",
        ],
      },
    })
      .select({ key: 1, value: 1 })
      .lean<RawSettingDoc[]>();
    const map = new Map(docs.map((doc) => [doc.key, doc.value]));
    return {
      enabled: asBoolean(map.get("chat.enabled"), DEFAULTS.enabled),
      liveModeEnabled: asBoolean(
        map.get("chat.liveModeEnabled"),
        DEFAULTS.liveModeEnabled,
      ),
      websocketUrl: asString(map.get("chat.websocketUrl"), DEFAULTS.websocketUrl),
      pollIntervalMsFocused: asNumber(
        map.get("chat.pollIntervalMsFocused"),
        DEFAULTS.pollIntervalMsFocused,
      ),
      pollIntervalMsBlurred: asNumber(
        map.get("chat.pollIntervalMsBlurred"),
        DEFAULTS.pollIntervalMsBlurred,
      ),
      guestThreadTokenDays: asNumber(
        map.get("chat.guestThreadTokenDays"),
        DEFAULTS.guestThreadTokenDays,
      ),
      attachmentsEnabled: asBoolean(
        map.get("chat.attachmentsEnabled"),
        DEFAULTS.attachmentsEnabled,
      ),
    };
  },
  ["chat-settings"],
  { revalidate: TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

export function getChatSettings(): Promise<ChatSettings> {
  return loadChatSettings();
}
