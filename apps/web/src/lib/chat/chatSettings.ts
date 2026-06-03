/**
 * Storefront-facing loader for `chat.*` settings.
 */

import { unstable_cache } from "next/cache";

import { connectDB, Setting } from "@store/db";

import {
  CHAT_SETTING_DB_KEY_LIST,
  mergeChatSettingsFromDb,
  type ChatSettingsValues,
} from "@store/shared";

import { STOREFRONT_CACHE_TAG } from "@/lib/core/cached";

export type ChatSettings = ChatSettingsValues;

const TTL_SECONDS = 30;

const loadChatSettings = unstable_cache(
  async (): Promise<ChatSettings> => {
    await connectDB();
    const docs = await Setting.find({ key: { $in: CHAT_SETTING_DB_KEY_LIST } })
      .select({ key: 1, value: 1 })
      .lean<Array<{ key: string; value: unknown }>>();
    return mergeChatSettingsFromDb(docs);
  },
  ["chat-settings"],
  { revalidate: TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

export function getChatSettings(): Promise<ChatSettings> {
  return loadChatSettings();
}
