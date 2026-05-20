/**
 * Standalone migration runner. Invoked via `npm run migrate -w @store/db`.
 *
 * Safety: refuses to do anything unless `RUN_MIGRATIONS=true` is set.
 * Tracks completed migrations in a `_migrations` collection so re-runs
 * skip already-applied migrations.
 *
 * Behaviour:
 *   - Connects via `connectDB()` so the runner shares the same Atlas
 *     credentials + pool tuning as the apps.
 *   - Iterates `migrations` in order, skips any whose `id` is already
 *     in `_migrations`, runs the rest, records each id on success.
 *   - Exits with code 1 on any failure so CI / operator scripts can
 *     fail loud.
 *
 * Per PLAN §12: forward-only, no down migrations. If something needs
 * to be undone we author a new migration that reverses the change.
 */

import mongoose from "mongoose";
import { logger } from "@store/shared";

import { connectDB } from "./connection";
import { migrations } from "./migrations";

const MIGRATIONS_COLLECTION = "_migrations";

interface MigrationRecord {
  id: string;
  ranAt: Date;
  label: string;
}

async function getApplied(): Promise<Set<string>> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongo connection has no db handle");
  }
  const docs = await db
    .collection<MigrationRecord>(MIGRATIONS_COLLECTION)
    .find({}, { projection: { id: 1 } })
    .toArray();
  return new Set(docs.map((doc) => doc.id));
}

async function recordApplied(id: string, label: string): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongo connection has no db handle");
  }
  await db.collection<MigrationRecord>(MIGRATIONS_COLLECTION).insertOne({
    id,
    ranAt: new Date(),
    label,
  });
}

async function main(): Promise<number> {
  if (process.env.RUN_MIGRATIONS !== "true") {
    logger.warn(
      "[migrate] RUN_MIGRATIONS env var is not set to 'true' — refusing to run. " +
        "Set RUN_MIGRATIONS=true on the command line to enable execution.",
    );
    return 0;
  }
  if (!process.env.MONGODB_URI) {
    logger.error("[migrate] MONGODB_URI is not set — aborting.");
    return 1;
  }
  logger.info("[migrate] connecting to MongoDB");
  await connectDB();
  const applied = await getApplied();
  let ranAny = false;
  try {
    for (const migration of migrations) {
      if (applied.has(migration.id)) {
        logger.info(
          { id: migration.id },
          `[migrate] already applied: ${migration.id} — skipping`,
        );
        continue;
      }
      logger.info(
        { id: migration.id, label: migration.label },
        `[migrate] would run ${migration.id} — executing`,
      );
      await migration.run();
      await recordApplied(migration.id, migration.label);
      ranAny = true;
      logger.info({ id: migration.id }, `[migrate] recorded: ${migration.id}`);
    }
    if (!ranAny) {
      logger.info("[migrate] already up to date");
    }
    return 0;
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    logger.error({ error }, "[migrate] failed");
    process.exit(1);
  });
