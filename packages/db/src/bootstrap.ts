/**
 * Reference-data bootstrap.
 *
 * Phase 1 retires the legacy category / grade pre-seed (those are now
 * admin-authored and the T1.21 catalog wipe drops everything anyway).
 * What remains is the **Setting** layer — the small key/value
 * configuration table that the runtime reads on every request. Some
 * keys (chat behaviour, store identity, SEO defaults) have to exist
 * for the apps to function even on a fresh database, so we `upsert`
 * sensible defaults at boot with `$setOnInsert` so admin edits made
 * later are never overwritten.
 *
 * Boot ordering:
 *   - `instrumentation.ts` calls `ensureReferenceData()` after the
 *     Mongo connection is requested. We don't await it — the first
 *     request that reads a setting will await `connectDB()` itself,
 *     which the bootstrap also awaits before any upsert.
 *   - Safe to call concurrently from web + admin instances; each
 *     upsert is atomic and `$setOnInsert` makes it idempotent.
 */
import { logger } from "@store/shared";

import { connectDB } from "./connection";
import { Setting } from "./models/Setting";

interface SettingDefault {
  key: string;
  value: unknown;
  description: string;
  group: string;
}

/**
 * Chat-system defaults backing the PLAN §12.4 transport model. The
 * storefront FAB reads `chat.enabled` to decide whether to ship any
 * chat-widget markup at all (master kill switch); polling intervals
 * tune the foreground / background refresh cadence; the WebSocket
 * keys are dormant until the optional Phase 9 broker lands.
 */
const CHAT_SETTINGS: SettingDefault[] = [
  {
    key: "chat.enabled",
    value: true,
    description:
      "Master switch. When false, the storefront FAB renders nothing and ships zero chat-widget JS.",
    group: "chat",
  },
  {
    key: "chat.liveModeEnabled",
    value: false,
    description:
      "When true AND chat.websocketUrl is set, clients attempt WebSocket; otherwise polling-only.",
    group: "chat",
  },
  {
    key: "chat.websocketUrl",
    value: "",
    description:
      "Base wss:// URL for the broker. Empty string disables WebSocket even when liveModeEnabled is true.",
    group: "chat",
  },
  {
    key: "chat.pollIntervalMsFocused",
    value: 5_000,
    description: "Foreground (focused tab) polling interval in milliseconds.",
    group: "chat",
  },
  {
    key: "chat.pollIntervalMsBlurred",
    value: 30_000,
    description: "Background (blurred tab) polling interval in milliseconds.",
    group: "chat",
  },
  {
    key: "chat.guestThreadTokenDays",
    value: 90,
    description:
      "Lifetime of the storefront's inquiry_thread_token cookie used by guest claimers.",
    group: "chat",
  },
  {
    key: "chat.attachmentsEnabled",
    value: false,
    description:
      "Gates image/file upload in the chat composer. Flips on once the Phase 2 upload route is live.",
    group: "chat",
  },
];

async function ensureDefaultSettings(): Promise<void> {
  for (const defaults of CHAT_SETTINGS) {
    await Setting.updateOne(
      { key: defaults.key },
      { $setOnInsert: defaults },
      { upsert: true },
    );
  }
}

/**
 * Public entrypoint called once at server boot from each app's
 * `instrumentation.ts`. Best-effort: a connectivity blip just logs and
 * returns — the next boot will retry.
 */
export async function ensureReferenceData(): Promise<void> {
  try {
    await connectDB();
    await ensureDefaultSettings();
    logger.info("reference-data: settings verified");
  } catch (error) {
    logger.error({ error }, "reference-data: bootstrap skipped this boot");
  }
}
