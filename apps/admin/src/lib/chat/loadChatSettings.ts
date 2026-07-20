import { connectDB, Setting } from "@store/db";
import { CHAT_SETTING_DB_KEY_LIST, mergeChatSettingsFromDb, type ChatSettingsValues } from "@store/shared";

export type ChatSettings = ChatSettingsValues;

export async function loadChatSettings(): Promise<ChatSettings> {
	await connectDB();
	const docs = await Setting.find({ key: { $in: CHAT_SETTING_DB_KEY_LIST } })
		.select({ key: 1, value: 1 })
		.lean<Array<{ key: string; value: unknown }>>();
	return mergeChatSettingsFromDb(docs);
}
