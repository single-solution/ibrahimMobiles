#!/usr/bin/env node
/**
 * Structural guardrail for the universal `StoredImage` policy.
 *
 * Walks every Mongoose schema exported from `@store/db`. For each schema,
 * inspects every path whose name suggests it carries an image
 * (image|logo|icon|banner|avatar|photo, case-insensitive) and asserts that
 * the path resolves to an embedded `StoredImage` sub-schema — i.e. the path
 * has its own `schema` whose top-level paths include `variants`,
 * `blurDataURL`, `width`, `height`, and `alt`. Anything that fails is
 * printed and the script exits non-zero.
 *
 * Intentional exemptions:
 *   - paths ending in `Video` / `videoUrl` (Grade inspection videos stay
 *     as raw URLs; they're not images).
 *   - discriminator helpers like `iconKind` and `iconEmoji` (the unicode
 *     codepoint is not an image).
 *
 * This runs in CI alongside the cheaper text-grep `lint:no-raw-image-urls`
 * so we catch both forms of regression: textual (`imageUrl: string`) and
 * structural (a future model that adds a `bannerImage` typed as raw
 * `String` and forgets to attach the sub-schema).
 *
 * Counterpart of TASKS.md T1.1.5 step 6.
 */

import { Schema } from "mongoose";

import * as models from "../src/models";

interface Failure {
  modelName: string;
  path: string;
  reason: string;
}

const IMAGE_PATH_PATTERN = /image|logo|icon|banner|avatar|photo/i;
const NON_IMAGE_SUFFIX_PATTERN = /(Video|videoUrl)$/i;
/** Paths that match the IMAGE pattern but are not image payloads themselves. */
const EXEMPT_PATHS = new Set(["iconKind", "iconEmoji"]);

const STORED_IMAGE_REQUIRED_PATHS = [
  "variants",
  "blurDataURL",
  "width",
  "height",
  "alt",
] as const;

function isStoredImageSchema(nested: Schema | undefined): boolean {
  if (!nested) return false;
  return STORED_IMAGE_REQUIRED_PATHS.every((p) => nested.path(p) != null);
}

function walkSchema(modelName: string, schema: Schema): Failure[] {
  const failures: Failure[] = [];

  schema.eachPath((pathName, schemaType) => {
    if (EXEMPT_PATHS.has(pathName)) return;
    if (NON_IMAGE_SUFFIX_PATTERN.test(pathName)) return;
    if (!IMAGE_PATH_PATTERN.test(pathName)) return;

    const nested = (schemaType as { schema?: Schema }).schema;
    const arrayInner = (
      schemaType as { caster?: { schema?: Schema } }
    ).caster?.schema;
    const candidate = nested ?? arrayInner;

    if (isStoredImageSchema(candidate)) return;

    failures.push({
      modelName,
      path: pathName,
      reason: candidate
        ? "embedded sub-schema does not match StoredImage shape (missing one of variants/blurDataURL/width/height/alt)"
        : "field is not an embedded StoredImage sub-schema (declared as a raw type, e.g. String). Use the shared `storedImageSchema` from packages/db/src/schemas/storedImageSchema.ts.",
    });
  });

  return failures;
}

function main() {
  const failures: Failure[] = [];
  for (const exportedValue of Object.values(models)) {
    if (
      exportedValue == null ||
      typeof exportedValue !== "function" ||
      !("modelName" in exportedValue) ||
      !("schema" in exportedValue)
    ) {
      continue;
    }
    const candidate = exportedValue as unknown as {
      modelName: string;
      schema: Schema;
    };
    if (typeof candidate.modelName !== "string") continue;
    if (!(candidate.schema instanceof Schema)) continue;
    failures.push(...walkSchema(candidate.modelName, candidate.schema));
  }

  if (failures.length === 0) {
    console.log(
      "[checkImageFields] OK — every image-bearing path resolves to a StoredImage sub-schema.",
    );
    process.exit(0);
  }

  console.error(
    "[checkImageFields] FAIL — image-named fields must be StoredImage sub-documents:",
  );
  for (const f of failures) {
    console.error(`  - ${f.modelName}.${f.path}: ${f.reason}`);
  }
  console.error(
    "\nFix: either (a) attach the shared `storedImageSchema` to this field, or (b) rename the field to something that doesn't trigger /image|logo|icon|banner|avatar|photo/i.",
  );
  process.exit(1);
}

main();
