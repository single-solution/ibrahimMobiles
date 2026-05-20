/**
 * Migration registry. Each entry maps a unique migration `id` to its
 * forward function. The runner records the `id` in the
 * `_migrations` collection once a migration has completed, so re-running
 * the command is a no-op (idempotent at the registry level).
 *
 * New migrations are append-only: never edit an already-released entry
 * in place. If the schema needs further changes, add a new id.
 */

import { simplificationV1 } from "./simplification-v1";

export interface Migration {
  /** Stable unique identifier persisted in `_migrations`. */
  id: string;
  /** Human-readable label used in logs. */
  label: string;
  /** Forward-only operation. Must be idempotent on retry. */
  run: () => Promise<void>;
}

export const migrations: readonly Migration[] = [
  {
    id: "simplification-v1",
    label: "Phase 1 catalog simplification — Inquiry rewrite, catalog wipe, role/enum reshape",
    run: simplificationV1,
  },
];
