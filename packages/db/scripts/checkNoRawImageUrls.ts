#!/usr/bin/env node
/**
 * Textual guardrail: forbid raw `*Url: string` declarations for image fields
 * inside `packages/db/src/`. The companion structural check
 * (`checkImageFields.ts`) walks the runtime Mongoose schemas; this script
 * additionally catches TypeScript-only declarations (interfaces and type
 * aliases) where the schema isn't authoritative yet.
 *
 * Banned patterns:
 *   - `imageUrl: string`
 *   - `logoUrl: string`
 *   - `iconUrl: string`
 *   - `bannerUrl: string`
 *   - `avatarUrl: string`
 *   - `photoUrl: string`
 *
 * Counterpart of TASKS.md T1.1.5 step 5. Node-based (not ripgrep) so it
 * runs in CI without binary dependencies.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "src");
const FORBIDDEN = [
  /\bimageUrl\s*:\s*string\b/,
  /\blogoUrl\s*:\s*string\b/,
  /\biconUrl\s*:\s*string\b/,
  /\bbannerUrl\s*:\s*string\b/,
  /\bavatarUrl\s*:\s*string\b/,
  /\bphotoUrl\s*:\s*string\b/,
];

interface Hit {
  file: string;
  line: number;
  text: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

function scan(files: string[]): Hit[] {
  const hits: Hit[] = [];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      for (const pattern of FORBIDDEN) {
        if (pattern.test(line)) {
          hits.push({ file, line: i + 1, text: line.trim() });
          break;
        }
      }
    }
  }
  return hits;
}

function main() {
  const files = walk(ROOT);
  const hits = scan(files);
  if (hits.length === 0) {
    console.log(
      "[checkNoRawImageUrls] OK — no raw `*Url: string` declarations found.",
    );
    process.exit(0);
  }
  console.error(
    "[checkNoRawImageUrls] FAIL — raw image URL fields are forbidden. Use `StoredImage` (from @store/shared) instead:",
  );
  for (const h of hits) {
    const rel = relative(process.cwd(), h.file);
    console.error(`  ${rel}:${h.line}: ${h.text}`);
  }
  process.exit(1);
}

main();
