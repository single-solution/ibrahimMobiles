/**
 * Reference-data bootstrap — **no-op after the Phase 1 refactor**.
 *
 * Before Phase 1, this module pre-populated the `Grade` and `Category`
 * collections from hardcoded `CONDITION_GRADES` and `CATEGORY_IDS`
 * enums on every boot. That model is gone:
 *
 *   - Categories, brands, grades, and attributes are now **fully
 *     admin-authored** through the Phase 3 categories workspace.
 *   - The Phase 1 catalog wipe (T1.21 in TASKS.md) deletes every legacy
 *     `Category` / `Grade` row; the admin reconstructs the taxonomy from
 *     scratch via Flow A.
 *   - There is therefore nothing to "ensure" at boot. Pre-seeding here
 *     would either fight admin choices (overwrite) or silently introduce
 *     enum drift between code and data.
 *
 * The function is preserved so `instrumentation.ts` callers in both apps
 * keep compiling without churn; it just logs and returns. It can be
 * removed entirely once Phase 1 settles and the call sites are tidied.
 */
import { logger } from "@store/shared";

export async function ensureReferenceData(): Promise<void> {
  logger.info(
    "reference-data: no-op (Phase 1 — categories/grades are admin-authored)",
  );
}
