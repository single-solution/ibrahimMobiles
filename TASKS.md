# TASKS.md — Step-by-step execution plan

> Companion to [PLAN.md](PLAN.md). `PLAN.md` explains the **design** and the **why**; this file is the **build order** and the **how**. Every task is sized to ~30–90 minutes of focused work, maps to a single commit, and has an explicit *Done when* check so you can pick this up after a break and resume cleanly.
>
> If a task is taking more than ~90 minutes you've probably bundled two — stop and split it.

---

## How to use this file

1. Find the lowest unchecked task `[ ]`.
2. Read its **Goal** (one line) and **Files** (the paths touched/created/deleted).
3. Follow **Steps** in order. Confirm **Done when** — that's the verification.
4. Tick the box, commit, push.
5. Take a break whenever. Next session opens this file and repeats from step 1.

### Stop & start protocol

**When you stop mid-task:**

- Commit work-in-progress on a topic branch with `wip:` prefix. Example: `wip: T1.6 variant rewrite — schema done, serializer pending`.
- Add a one-line **Resume note** below the task description in this file (use the `Resume note` slot already provided in each task template). Be specific: *"Done: schema cuts. Next: update `serializers/product.ts` lines 40–80, then run `npm run typecheck`."*
- Push.

**When you resume:**

- Open this file. Find the topmost task that isn't `[x]`. Read its **Resume note** if present.
- Run `git status` to see your WIP state.
- Continue from the resume note. Clear the resume note when the task is done.

### Conventions

- One task = one commit. Commit message format: `T<phase>.<n>: <short description>`. Example: `T1.6: rewrite Variant subdocument schema`.
- Tasks within a phase are sequential — finish *N* before starting *N+1* unless the task explicitly says "parallel-safe with TX.Y".
- Phases 1 and 6 are atomic at their boundaries: don't ship a half-migrated schema or a half-built chat to production. Within a phase, branch-level WIP is fine.
- All numeric defaults follow `vibeCodingRules` unless PLAN.md overrides them.

### Running the workspace

```bash
# From repo root:
npm install                              # one-time
npm run dev                              # both apps in parallel (turbo)
npm run dev:web                          # storefront only
npm run dev:admin                        # admin only
npm run lint                             # turbo runs lint in every package
npm run typecheck                        # turbo runs tsc --noEmit in every package
npm run build                            # production build, both apps

# Phase 1 introduces:
RUN_MIGRATIONS=true npm run migrate -w @store/db   # one-shot data migration
```

### Branching strategy

- `main` — production, only fully-shipped phases land here.
- One topic branch per phase: `phase-0-quick-wins`, `phase-1-schema`, `phase-2-uploads`, etc.
- One sub-branch per task is **optional** — only worth it for high-risk tasks (T1.19+).
- Squash-merge each phase into `main` once the whole phase's tasks are `[x]` and the *Phase exit criteria* check passes.

---

## Summary

| Phase | Scope | Tasks | Risk | Status |
|-------|-------|-------|------|--------|
| 0 | Quick wins — visuals, naming, file cleanup (no schema, no API) | 6 | Low | ☑ shipped on `phase-0-quick-wins` (7 commits, 2026-05-20; both apps build, lint+typecheck green) |
| 1 | Data-model alignment + universal `StoredImage` audit (Variant/Category icon/Offer banner/Settings logo+favicon+OG/Inquiry attachment shape) + catalog wipe + Inquiry restructure | 24 | High | ⧖ Group A complete (T1.1 – T1.11, 10 commits on `phase-1-data-model`, `db typecheck` + image lint guardrails green; app workspaces intentionally red per Group A → Group B contract); Group B (T1.12 – T1.18) in progress |
| 2 | Image / video uploads — pre-generated variants + StorageProvider abstraction + single `<ImageGallery>` / `<ImageUpload>` reused everywhere | 6 | Low | ☐ |
| 3 | Categories workspace (Flow A) + shared storefront visuals + multi-tile `<PreviewMatrix>` per entity (always-on, real-data context) | 11 | Medium | ☐ |
| 4 | Product creation page (`/products/new`) with product card + PDP hero previews | 8 | Low | ☐ |
| 5 | Product editor + variant list refactor | 5 | Low | ☐ |
| 6 | Storefront PDP alignment | 6 | Medium | ☐ |
| 7 | SEO foundations + JSON-LD + sitemap + robots + dynamic OG images + admin SEO panel (SERP preview, checklist score) + global SEO settings | 13 | Medium | ☐ |
| 8 | Chat plugin (widget + inbox + APIs + polling transport) | 19 | Medium | ☐ |
| 8.5 | Chat attachments (depends on Phase 2) | 2 | Low | ☐ |
| 9 | (Optional, post-EC2) WebSocket broker enable | 3 | Low | ☐ |

**Total tasks: 103.**

---

## Pre-flight — once, before any phase

### PF.1 Confirm tooling

- [ ] Run `node --version` → must be `v22.x` (see `package.json` engines).
- [ ] Run `npm --version` → must be `>=10`.
- [ ] Run `npm install` from root, confirm no errors.
- [ ] Run `npm run typecheck` from root → record any pre-existing errors. **These are baseline; you do not fix them in this project unless a task touches the file.**
- [ ] Run `npm run lint` from root → same baseline rule applies.
- [ ] **Done when:** `typecheck` and `lint` complete and the baseline counts are written into a comment at the bottom of this file.

### PF.2 Capture baseline DB state

- [ ] Note: live DB is MongoDB Atlas via `MONGODB_URI` in `.env.local`.
- [ ] Run `mongodump --uri="$MONGODB_URI" --out=./backups/pre-refactor-$(date +%Y%m%d)`.
- [ ] Verify backup folder exists and contains BSON files for every collection.
- [ ] Add `./backups/` to `.gitignore` if not already.
- [ ] **Done when:** backup folder exists and is not tracked by git.

### PF.3 Read PLAN.md end-to-end

- [ ] Read PLAN.md once, top to bottom, even sections that feel "done". The reasoning behind every cut/rename lives there.
- [ ] If anything in PLAN.md is unclear or contradicts a task here, fix it **in PLAN.md** before doing the task. Never let TASKS.md drift from PLAN.md.
- [ ] **Done when:** you can name the five design principles from §1 without looking.

### PF.4 Capture perf baseline

> **Why:** every phase that touches the storefront must prove it didn't regress. Without a baseline, "perf didn't regress" is just vibes.

- [ ] **Bundle baseline.** Run `npm run build:web` from repo root. From the Next.js build output, capture First Load JS (gzip) for: `/`, `/shop`, `/shop/[category]`, `/shop/[category]/[slug]`, `/cart`, `/checkout`. Paste into the **Baseline metrics** section at the bottom of this file.
- [ ] **Admin bundle baseline.** Same for admin: `/`, `/products`, `/customers`, `/orders`, `/categories`, `/inquiries`. Record.
- [ ] **Lighthouse baseline.** Run Lighthouse (Chrome DevTools, Mobile profile, Fast 3G, Slow 4G CPU) against deployed prod (or `npm run start:web` against a prod build) for `/` and a real PDP. Record LCP, CLS, TBT, INP. Run three times, record the median.
- [ ] **Mongo query baseline.** Open DevTools Network → filter to `localhost:300X` document requests. Reload the home page; record number of `?_rsc=` document fetches. Reload a PDP; record again.
- [ ] **`sitemap.xml` baseline.** `curl -w '%{time_total}\n' -o /dev/null -s https://<prod-host>/sitemap.xml` twice. Record cold + warm timings. (Phase 7 will replace this with a richer sitemap; we want the before/after.)
- [ ] **Done when:** every cell in the "Baseline" column of PLAN.md Appendix D § D.3 has a real number, and the Baseline metrics section at the bottom of this file has bundle sizes for both apps.
- **PLAN ref:** Appendix D § D.3, § D.4.
- **Resume note:** —

---

## Phase 0 — Quick wins

> Low-risk visual + naming fixes that don't touch the schema or the API. All six are independent — order is just for ease of review. Ship as a single PR.

### T0.1 Fix the mobile-dashboard `.app-section` CSS bug

- **Goal:** Restore the missing `.app-section` / `.app-section-eyebrow` CSS classes on the admin app so the mobile dashboard renders properly.
- **Files:** `apps/admin/src/app/globals.css`
- **Steps:**
  1. Open `apps/web/src/app/globals.css`, copy the `.app-section { ... }` and `.app-section-eyebrow { ... }` rules.
  2. Paste them into `apps/admin/src/app/globals.css`, in the same section as the other layout helpers.
  3. Run `npm run dev:admin`, open `http://localhost:3001/` (or whichever port admin runs on) on a mobile viewport (DevTools → iPhone 14).
- **Done when:** the dashboard mobile view shows uppercase tracked eyebrow text in `--color-ink-500` above each section header, matching the storefront's section style.
- **PLAN ref:** §1 (last bullet of Locked decisions), §8.
- **Resume note:** —

### T0.2 Tighten AdminShell padding and gap

- **Goal:** Reduce wasted whitespace per §8.
- **Files:** `apps/admin/src/components/AdminShell.tsx`
- **Steps:**
  1. Locate the outer wrapper. Change `md:p-3` → `md:p-2` and `md:gap-3` → `md:gap-2`.
  2. Locate the `<main>` element. Change `md:px-8 md:py-8` → `md:px-5 md:py-4`.
  3. Move the footer into the content column so it aligns with the right edge of `<main>` instead of the viewport.
  4. Visually diff against `/`, `/products`, `/customers` at desktop and tablet widths.
- **Done when:** no horizontal misalignment between the page content's right edge and the footer's right edge.
- **PLAN ref:** §8.
- **Resume note:** —

### T0.3 PageTitle + loading skeleton alignment

- **Goal:** Loading skeletons (e.g. `apps/admin/src/app/products/loading.tsx`) currently show a chunk much wider than the real `PageTitle` renders. Match the dimensions.
- **Files:** `apps/admin/src/components/PageTitle.tsx`, and every `*/loading.tsx` under `apps/admin/src/app/`.
- **Steps:**
  1. Inspect `PageTitle.tsx`. Note the actual rendered heading classes (height, font size, vertical padding).
  2. For every `loading.tsx`, replace the top-of-page skeleton block with one whose dimensions match the real title height and width.
  3. Visually verify each page's loading state matches the in-page header geometry.
- **Done when:** flipping between a loading skeleton and the loaded page does not cause a layout jump in the header.
- **PLAN ref:** §8.
- **Resume note:** **Audited 2026-05-20 and skipped.** 13 of 16 `loading.tsx` files use the shared `<AdminPageSkeleton>` with explicit `titleWidthClass` / `eyebrowWidthClass` props already sized to match the real `<PageTitle>` within ±1px (eyebrow 10px skeleton vs 11px real, title 32px skeleton vs 33px real, description 14px skeleton vs ~14px real). The 3 manual skeletons (`app/loading.tsx` dashboard, `app/products/[id]/loading.tsx`, `app/products/new/loading.tsx`) have minor structural quirks but no observable layout jump. The original premise ("skeleton chunk much wider than real PageTitle") no longer holds — fixed in an earlier commit. Will revisit if Phase 5 product-editor refactor introduces a real jump.

### T0.4 DataTable enrichment

- **Goal:** `DataTable` is the workhorse for every admin list. Bump default density, add sticky header, add column-sort, and add a `filterBar` slot.
- **Files:** `apps/admin/src/components/DataTable.tsx`, plus every consumer (`Customers.tsx`, `Orders.tsx`, `Inquiries.tsx`, etc.) gets a one-line consumer fix.
- **Steps:**
  1. Change default `pageSize` prop from current value to `50`.
  2. Reduce row vertical padding by ~30% (e.g. `py-3` → `py-2`).
  3. Add `sticky top-0 bg-[var(--color-surface)] z-10` to `<thead>` so headers stick when scrolling.
  4. Add an optional `sortable?: boolean` per column. When true, render a chevron and toggle ascending/descending in component state. Sorting is client-side; rely on the existing `cell` accessor to derive the sort value when not provided, or accept a `sortAccessor?: (row) => string | number` per column.
  5. Add a `filterBar?: ReactNode` prop rendered immediately above the table inside the same card.
  6. For each consumer, no API change is needed if the consumer didn't pass `pageSize` — bump only the ones that did.
- **Done when:**
  - All admin list pages show 50 rows by default.
  - Scrolling the page keeps column headers visible.
  - Clicking a sortable column toggles ascending/descending.
  - The `filterBar` slot renders correctly on at least one consumer (try Customers).
- **PLAN ref:** §8.
- **Resume note:** —

### T0.5 Web-side `*View` orphan cleanup

- **Goal:** The storefront has duplicate pairs like `CompareVariants.tsx` + `CompareVariantsModal.tsx` and `AccessoryDetail.tsx` + `AccessoryDetailView.tsx`. Delete the orphan halves, rename the survivors to drop the suffix.
- **Files:** see PLAN.md Appendix B § Deleted files (web side).
- **Steps:**
  1. For each pair, identify which is imported (the survivor) using `grep` / `rg` from repo root.
  2. Delete the orphan.
  3. Rename the survivor to drop `View` / `Modal` / `Sheet` suffix (unless mechanism naming is justified per `naming.md` § Banned Filename Suffixes — kept primitives like `Drawer`, `Modal`, `Sheet` in `components/ui/`).
  4. Update import paths at every call site.
  5. Run `npm run typecheck` from root — must pass.
- **Done when:** every `*View` / `*Sheet` / `*Modal` outside `components/ui/` has been justified or removed; `typecheck` is green.
- **PLAN ref:** §11, Appendix B.
- **Resume note:** —

### T0.6 Admin-side `*View` orphan cleanup

- **Goal:** Same as T0.5, on the admin app. Touches `CustomersView.tsx`, `OrdersView.tsx`, `InquiriesView.tsx`, `OffersView.tsx`, `TeamView.tsx`, `SettingsView.tsx`, plus the categories orphans.
- **Files:** see PLAN.md Appendix B § Deleted files (admin side) + § Renamed files.
- **Steps:**
  1. For each `*View.tsx` orphan pair, delete the orphan and rename the survivor to drop the suffix.
  2. Delete `categories/Categories.tsx`, `CategoryWorkspace.tsx`, `CategoryEditor.tsx` (the orphan), `CategoryGrid.tsx`, `CategoryDetailView.tsx`, `CategoryDrawer.tsx` — these are all being replaced by the new components in Phase 3 (Flow A in PLAN.md §3).
  3. Delete `apps/admin/src/app/categories/[slug]/page.tsx` — the detail route is gone (PLAN §3).
  4. Update imports.
  5. Run `npm run typecheck` from root.
- **Done when:** `typecheck` is green. Admin sidebar still works (no broken nav links). At this point, the categories page may temporarily render a stub — that's fine, Phase 3 builds it back.
- **PLAN ref:** §3, §11, Appendix B.
- **Resume note:** —

**Phase 0 exit criteria:** `npm run typecheck` + `npm run lint` both green. Manual smoke: admin loads, every nav item resolves to a page (even if stubbed). Storefront loads, PDP renders, no console errors. Then squash-merge `phase-0-quick-wins` into `main`.

---

## Phase 1 — Data-model alignment + migration

> **High-risk phase.** Schema changes on every model. Live data is in Atlas. The migration is one-shot and idempotent (gated by a marker in a `migrations` collection). Do **not** ship Phase 1 to prod until every code consumer is updated and the migration is dry-run on a staging clone.
>
> Internal order: (A) schemas first, (B) consumers next, (C) migration last. Do not invert.

### Group A — Schemas

> **Group A status (2026-05-20):** ☑ COMPLETE. All 12 schema-level tasks shipped on `phase-1-data-model` across 10 commits. `npm run typecheck -w @store/db` is green; `lint:image-fields` and `lint:no-raw-image-urls` are green. App workspaces (`@store/admin`, `@store/web`) are intentionally red — Group B (T1.12 – T1.18) sweeps the consumers. Approx. 35 files / ~125 typecheck errors await consumer surgery: 25 admin (serializers + API routes + UI), 10 web (storefront serializers + queries + layout reference loader + sitemap).

#### T1.1 New Attribute model

- **Goal:** Create `packages/db/src/models/Attribute.ts` as the canonical attribute model (already exists per git status — confirm and align with PLAN.md §10).
- **Files:** `packages/db/src/models/Attribute.ts`, `packages/db/src/models/index.ts`.
- **Steps:**
  1. Define the schema per PLAN.md §10: fields are `categorySlug`, `slug` (auto from label), `label`, `options: { value, label }[]`, `cardPosition?`, `isActive`, `sortOrder`.
  2. Drop the legacy concepts: no `type`, no `scope`, no `unit`, no `key` (renamed to `slug`).
  3. Pre-save hook: slugify `label` into `slug` if `slug` is empty.
  4. Index: `{ categorySlug: 1, isActive: 1 }`.
  5. Export from `packages/db/src/models/index.ts`.
- **Done when:** `npm run typecheck -w @store/db` passes; the model is importable as `import { Attribute } from "@store/db"`.
- **PLAN ref:** §10 (Attribute).
- **Resume note:** **Shipped 2026-05-20** on `phase-1-data-model`. Per PLAN §10 final shape: `(categorySlug, slug, label, options[{value,label}], cardPosition, isActive)`. No `type/scope/unit/sortOrder/key`. Slug auto-generated via `pre("validate")` hook calling `slugify(label, 60)`. `(categorySlug, slug)` unique index. Slugify lifted out of `apps/admin/src/lib/services/slug.ts` (deleted) into `@store/shared/slug` so the db pre-hook can use it; six admin API routes updated to import from `@store/shared` instead.

#### T1.1.5 Image-field audit — every image field becomes `StoredImage` (no `*Url: string` shortcuts)

- **Goal:** Lock in the universal-image-schema rule from PLAN §1 + §10 ("Shared: StoredImage subdocument"). Audit every model under `packages/db/src/models/` and convert every image-bearing field to `StoredImage` (or `StoredImage[]` for ordered collections). The `StoredImage` type lives in `packages/shared/src/storage/types.ts` (forward-declared in T1.6, fully implemented in T2.1.5); models reference it now so Phase 2 doesn't need a second schema migration.
- **Files:**
  - `packages/db/src/models/Category.ts` (icon field — discriminated union)
  - `packages/db/src/models/Offer.ts` (banner image)
  - `packages/db/src/models/Setting.ts` (store.logo, store.favicon, seo.ogImageDefault)
  - `packages/db/src/models/Inquiry.ts` (Phase 8.5 attachments — placeholder shape here so the schema is ready)
  - `packages/shared/src/storage/types.ts` (already exists from T1.6; verify export)
- **Steps:**
  1. **Category.icon.** Replace the existing single string field with a discriminated union:
     ```ts
     iconKind: "emoji" | "image";
     iconEmoji?: string;    // present when iconKind === "emoji"
     iconImage?: StoredImage; // present when iconKind === "image"
     ```
     Storage uses a single embedded sub-schema; the API validates that exactly one of `iconEmoji` / `iconImage` is set per `iconKind`.
  2. **Offer.bannerImage.** Add an optional `bannerImage?: StoredImage` field. Drop any pre-existing `imageUrl: string` if present.
  3. **Setting model keys.** The settings table is key/value; image values land in a small set of well-known keys, each stored as a `StoredImage` JSON blob:
     - `store.logo` → `StoredImage`
     - `store.favicon` → `StoredImage`
     - `seo.ogImageDefault` → `StoredImage`
     Update the value validator in `T1.11`-adjacent Setting plumbing so these keys accept a `StoredImage` JSON shape rather than a raw URL.
  4. **Inquiry message attachments (Phase 8.5 prep).** Add the field shape now (`InquiryMessageAttributes.attachments?: Array<{ kind: "image"; image: StoredImage } | { kind: "file"; url: string; mime: string; sizeBytes: number; filename: string }>`) so Phase 8.5 just toggles a UI without a second schema migration.
  5. **Grep guardrail.** After all edits, `rg --type=ts "imageUrl: string|logoUrl: string|iconUrl: string|bannerUrl: string|avatarUrl: string"` inside `packages/db/src/` must return zero results. Any remaining match is a raw image URL that escaped the audit and must be converted to `StoredImage` (or explicitly justified as a non-image URL, e.g. `videoUrl` which stays as a raw string for now).
  6. **Structural check (Node script — not a test framework, since PLAN.md §15 keeps test runners out of scope).** Add `packages/db/scripts/checkImageFields.ts`: a small Node script that imports every model, walks each schema's paths, and `process.exit(1)` if any path whose name matches `/image|logo|icon|banner|avatar|photo/i` (excluding paths ending in `Video`/`videoUrl`) isn't a sub-document that resolves to the `storedImageSchema` (or `Mixed` bound by a `StoredImage` JSON Schema validator). Wire it into `packages/db/package.json` as `"lint:image-fields": "node --import tsx ./scripts/checkImageFields.ts"`.
- **Done when:**
  - `npm run typecheck` is green.
  - `rg --type=ts "imageUrl: string|logoUrl: string|iconUrl: string|bannerUrl: string|avatarUrl: string" packages/db/src/` returns zero matches.
  - The grep guardrail is added to `package.json` `scripts.lint:no-raw-image-urls` so CI rejects future regressions: `"lint:no-raw-image-urls": "rg --type=ts --quiet 'imageUrl: string|logoUrl: string|iconUrl: string|bannerUrl: string|avatarUrl: string' packages/db/src/ && (echo 'Raw image URL fields are forbidden — use StoredImage' && exit 1) || exit 0"`.
  - `npm run lint:image-fields --workspace @store/db` exits 0.
  - Both new scripts are added to the root `npm run lint` chain so they run on every CI build.
- **PLAN ref:** §1 ("Images are pre-generated … universal"), §10 (StoredImage + image-field inventory).
- **Resume note:** **Shipped 2026-05-20** on `phase-1-data-model`. Foundation in place: `packages/shared/src/storage/types.ts` (`StoredImage`, `StoredImageVariants`, `isStoredImage` type guard), `packages/db/src/schemas/storedImageSchema.ts` (Mongoose embedded `_id: false` sub-schema). New helper type `WithTimestamps<T>` in `@store/db` lets serializers opt into `createdAt`/`updatedAt` without polluting model interfaces. Models touched: Category (added `iconKind`/`iconEmoji?`/`iconImage?` triplet with discriminator pre-validate hook; legacy fields untouched — T1.2 cuts them), Offer (added `bannerImage?`). **Inquiry attachments deferred to T1.7** (no `messages` array exists yet — T1.7 creates it from scratch with attachments baked in). **Setting model unchanged** (Mixed value already accepts StoredImage JSON; API validator change deferred to T1.11/T1.14). Lint guardrails (`lint:image-fields` structural, `lint:no-raw-image-urls` textual) added but **NOT yet wired to root `npm run lint`** — both intentionally fail on `Product.imageUrl: string` until T1.5/T1.6 replace it; wire-up happens at the end of Group A. `tsx` added as a `@store/db` devDep for the lint scripts. Downstream consequences (unchanged): T2.2 (upload route returns `StoredImage` for every consumer, not just product variants), T2.3 (the **single** `ImageGallery` component is reused by Category icon picker, Offer banner editor, Settings logo/favicon/OG picker), T3.4 (Category drawer's icon picker offers emoji + image, image goes through `<ImageUpload>`), T3.10 (Offer + StoreInfo editors consume `StoredImage`).

#### T1.2 Category model cuts

- **Goal:** Reduce `Category` to its essential shape. **The icon field becomes the discriminated `iconKind` + `iconEmoji?` + `iconImage?` union from T1.1.5** — not a single `icon: string`.
- **Files:** `packages/db/src/models/Category.ts`.
- **Steps:**
  1. Drop fields: `pluralLabel`, `pathSegment`, `trustChips`, `emptyHint`, `applicableGrades`.
  2. Rename `tagline` → `description`.
  3. Replace the legacy single `icon?: string` field with the discriminated triplet `iconKind: "emoji" \| "image"`, `iconEmoji?: string`, `iconImage?: StoredImage` per PLAN.md §10 Category interface (the inventory in T1.1.5 sets this up; T1.2 is where the model finally declares it).
  4. Keep: `slug` (auto), `label`, `description`, `iconKind`, `iconEmoji?`, `iconImage?`, `sortOrder`, `isActive`.
  5. Add a pre-save hook to slugify `label` into `slug` when empty.
  6. Add a pre-save guard: if `iconKind === "emoji"` require `iconEmoji` and nullify `iconImage`; if `iconKind === "image"` require `iconImage` and nullify `iconEmoji`.
  7. Remove the export of `CONDITION_GRADES` from this file (it moves to Grade as enum source-of-truth — see T1.4).
- **Done when:** `typecheck -w @store/db` passes; no caller in the codebase imports the removed fields (run `rg "applicableGrades|pathSegment|pluralLabel|trustChips|emptyHint"` and expect zero hits in `packages/db` and only consumer-update hits in apps/); `rg "icon\\?: string" packages/db/src/models/Category.ts` returns zero (the single string field is gone).
- **PLAN ref:** §10 (Category), T1.1.5 (universal `StoredImage`).
- **Resume note:** **Shipped 2026-05-20.** Final shape per PLAN §10: `(slug, label, description, iconKind, iconEmoji?, iconImage?, sortOrder, isActive)`. Pre-validate hook handles both slug auto-gen (`slugify(label, 64)`) and the icon discriminator (nulls the inactive side) in one pass. Caveat: `CONDITION_GRADES` / `ConditionGrade` / `CATEGORY_IDS` / `CategoryId` kept as `@deprecated` re-exports from Category.ts purely to keep apps' imports resolving until Group B sweeps them; will be removed at the end of Group A. `packages/db/src/bootstrap.ts` was neutered (no more category/grade pre-seed) but then re-introduced in T1.11 for chat.* settings.

#### T1.3 Brand model cut

- **Goal:** Drop `tagline` from `Brand`.
- **Files:** `packages/db/src/models/Brand.ts`.
- **Steps:**
  1. Remove `tagline` from interface, schema, and any indexes.
  2. Confirm slug auto-generation hook is in place; add one if not.
- **Done when:** `typecheck -w @store/db` passes.
- **PLAN ref:** §10 (Brand), Appendix C § Brand collection.
- **Resume note:** **Shipped 2026-05-20.** Final shape: `(slug, name, categorySlugs[], sortOrder, isActive)`. `categorySlugs` is required, ≥1 element — drives the inline brand chips on category cards (Flow A), the per-category brand picker on product-create (Phase 4), and the storefront brand filter on category landing pages. Slug auto-gen via pre-validate (`slugify(name, 64)`). Indexes: `{ categorySlugs, isActive, sortOrder, name }` (dominant per-category lookup) + `{ sortOrder, name }` (admin all-brands grid). `createdAt`/`updatedAt` dropped from the interface per the framework-managed-fields rule.

#### T1.4 Grade model rewrite

- **Goal:** Collapse `Grade` to category-scoped, hex-colored, video-required shape.
- **Files:** `packages/db/src/models/Grade.ts`, `packages/db/src/models/index.ts`.
- **Steps:**
  1. Drop fields: `shortLabel`, `cosmeticNotes`, `functionalNotes`, `tone`, `sortOrder`, `inspectionVideoUrl`.
  2. Add / rename: `notes` (single combined long-text field), `color` (hex string, validator `/^#[0-9a-f]{6}$/i`), `video` (Vercel Blob URL, required).
  3. Required fields: `categorySlug`, `slug` (auto from label), `label`, `notes`, `color`, `video`.
  4. Pre-save hook: slugify `label` into `slug` if empty.
  5. Index: `{ categorySlug: 1, slug: 1 }` unique compound.
  6. **Caveat:** during migration `video` will be empty. Make the validator allow empty during migration window via a flag, OR keep `video` non-required at the schema level and enforce required in API validation. Choose API-level enforcement to keep schema migration simple.
- **Done when:** `typecheck -w @store/db` passes; no consumer file imports `cosmeticNotes` / `functionalNotes` / `tone` / `inspectionVideoUrl` from `@store/db`.
- **PLAN ref:** §10 (Grade), §4 (Flow B).
- **Resume note:** **Shipped 2026-05-20.** Final shape per PLAN §10: `(categorySlug, slug, label, notes, color, video)`. Drops `shortLabel`/`cosmeticNotes`/`functionalNotes`/`description`/`tone`/`sortOrder`/`inspectionVideoUrl`. `notes` (≤1200) is the single combined long-text field; `color` is hex `/^#[0-9a-f]{6}$/i` (default `#1f2937`); `video` is required at the API layer (T1.14) but **schema-optional** to make the migration window legal (legacy grades have no video URL). Slug auto-gen via `slugify(label, 64)`. Unique compound `{ categorySlug, slug }`.

#### T1.5 Product model rewrite

- **Goal:** Strip `Product` to category-driven shell with variant-centric content.
- **Files:** `packages/db/src/models/Product.ts`.
- **Steps:**
  1. Drop product-level fields: `modelName` (renamed `name`), `imageUrl`, `galleryUrls`, `highlights`, `attributes`, `accessoryType`, `gadgetType`, `releaseYear`.
  2. Keep: `name`, `slug` (auto from name), `brandSlug`, `categorySlug`, `isActive`, `isArchived`, `isFeatured`, `variants: VariantSubdocument[]`.
  3. Pre-save hook: slugify `name` into `slug`.
  4. Index: `{ categorySlug: 1, isActive: 1, isFeatured: -1 }`, `{ slug: 1 }` unique.
- **Done when:** `typecheck -w @store/db` passes.
- **PLAN ref:** §10 (Product).
- **Resume note:** **Shipped 2026-05-20** as a combined T1.5 + T1.6 commit (variant subdocument lives in the same file). Product final shape: `(slug, name, brandSlug, categorySlug, isActive, isArchived, isFeatured, variants[])`. Dropped: `modelName`(→`name`), `imageUrl`, `galleryUrls`, `highlights`, product-level `attributes`, `accessoryType`, `gadgetType`, `releaseYear`. Slug auto-gen via `slugify(name, 96)`. Indexes rebuilt around `(categorySlug, isActive, isArchived, *)` since that's the dominant storefront query path; `{ brandSlug, name }` kept for brand landing; admin all-products keeps `{ isArchived, createdAt }`.

#### T1.6 Variant subdocument rewrite

- **Goal:** Variant becomes the unit of inventory + imagery + attributes. Image entries are full `StoredImage` records (4 pre-rendered WebP variants + blurhash + dims + alt) from day one — image SEO, accessibility, perf, and S3-portability are first-class. See PLAN §10 (StoredImage), §13 (SEO), Appendix D § D.2 (Phase 2 image pipeline).
- **Files:** `packages/db/src/models/Product.ts` (the variant sub-schema lives inside), plus `packages/shared/src/storage/types.ts` for the `StoredImage` type (it's introduced fully in T2.1.5; for Phase 1 just declare the interface so the variant schema can reference it).
- **Steps:**
  1. Rename `grade` → `gradeSlug` (string, looked up against `Grade` table, validated by API in T1.14).
  2. Rename `imageUrls` → `images`. **Shape becomes `StoredImage[]`** per PLAN §10:
     ```ts
     interface StoredImage {
       variants: { thumb: string; card: string; detail: string; full: string };
       blurDataURL: string;
       width: number;
       height: number;
       alt: string;
     }
     ```
     Make required, ≥1.
  3. Inside the variant schema, define a `storedImageSchema` sub-sub-schema with no `_id`. Each variant URL is `{ type: String, required: true }`; `blurDataURL`, `alt` are required strings; `width`, `height` are required Numbers (positive). Nest under `variant.images: { type: [storedImageSchema], default: [] }`.
  4. Add `quantity: number` (default 0, replaces `isInStock: boolean`).
  5. Drop hardcoded typed fields: `storageGb`, `ramGb`, `batteryHealthMinPercent`, `batteryHealthMaxPercent`, `isPtaApproved`, `connector`, `wattage`, `lengthMeters`, `isGenuine`, `colorName`, `originalPriceRupees`, `notes`.
  6. Keep: `gradeSlug`, `priceRupees`, `quantity`, `warrantyMonths?`, `images: StoredImage[]`, `attributes: Record<string, string>`.
  7. No enum constraint on `gradeSlug` at the schema level — API-level validation against the `Grade` collection (T1.14).
  8. **For Phase 1 only**, the `StoredImage` interface lives in `packages/shared/src/storage/types.ts` as a forward-declared type. T2.1.5 wires it up fully (with the runtime `StorageProvider` interface alongside). Phase 1 just needs the shape.
- **Resume note (T1.6):** **Shipped 2026-05-20** in the same commit as T1.5. Variant final shape per PLAN §10: `(gradeSlug, priceRupees, quantity, warrantyMonths?, images: StoredImage[] (≥1), attributes: Record<string,string>)`. `isInStock` boolean is derived from `quantity > 0` at serializer time (not stored). No schema-level enum on `gradeSlug` — API validates against `Grade.find({ categorySlug })` at T1.14. Image entries use the shared `storedImageSchema` sub-sub-schema (4 pre-rendered WebP variants + blurhash + dims + alt) from day one. Lint guardrails `lint:image-fields` + `lint:no-raw-image-urls` both green after this commit — no raw `imageUrl: string` anywhere in `packages/db/src/`.
- **Done when:** `typecheck -w @store/db` passes; the variant sub-schema is < 45 lines; `Variant.images[0]` is typed as `StoredImage` (TypeScript can resolve every field including `variants.thumb`).
- **PLAN ref:** §10 (StoredImage + Variant), §5 (Flow C), §13.2, Appendix D § D.2 (Phase 2 risks).
- **Resume note:** Downstream consequences: T2.2 (upload route generates + returns `StoredImage`), T2.3 (ImageGallery operates on `StoredImage[]`, renders `variants.thumb`), T4.5 (CreateProduct stores `StoredImage[]`), T6.2 (storefront gallery picks the right variant per surface + uses `blurDataURL`), T7.8 (OG image route reads `variants.detail`), all serializers re-emit the new shape.

#### T1.7 Inquiry model rewrite (chat conversion)

- **Goal:** Turn `Inquiry` into the threaded chat doc.
- **Files:** `packages/db/src/models/Inquiry.ts`.
- **Steps:**
  1. Define `InquiryMessageAttributes` interface and sub-schema per PLAN.md §10 and §12.3. Fields: `author` (`"customer" | "agent"`), `authorUserId?`, `authorName`, `body` (≤4000), `attachments?: Array<{ kind: "image"; image: StoredImage } \| { kind: "file"; url: string; mime: string; sizeBytes: number; filename: string }>` (final Phase 8.5 shape — define now so no second schema migration is needed), `createdAt`, `readByCustomerAt?`, `readByTeamAt?`.
  2. Update `InquiryAttributes`: add `customerId?`, `subjectProductId?` (renamed from `productId`), `subjectProductName?`, `messages: InquiryMessageAttributes[]`, `lastMessageAt`, `lastMessagePreview` (≤140), `lastMessageAuthor`, `unreadByCustomer`, `unreadByTeam`, `internalNotes?` (renamed from `notes`).
  3. Drop fields: `modelName`, `variantSummary`, `expectedRupees`, `source`, `receivedAt`, `lastMessage`, `customerCity`.
  4. Update status enum: `["open", "awaiting-customer", "resolved"]`. Drop `INQUIRY_SOURCES` constant entirely.
  5. Indexes per §12.3: `{ phoneNumber: 1 }`, `{ status: 1, lastMessageAt: -1 }`, `{ assignedToUserId: 1, status: 1 }`, `{ customerId: 1, lastMessageAt: -1 }`.
- **Done when:** `typecheck -w @store/db` passes; `INQUIRY_SOURCES` no longer exported from `@store/db`.
- **PLAN ref:** §10 (Inquiry), §12.3.
- **Resume note:** —

#### T1.8 User model — drop legacy role aliases

- **Goal:** Tighten `USER_ROLES` enum after the migration backfills.
- **Files:** `packages/db/src/models/User.ts`.
- **Steps:**
  1. Confirm the migration step T1.23 will rewrite every doc with legacy roles **before** this tightening lands.
  2. Remove `"manager"`, `"staff"`, `"media_manager"` from `USER_ROLES`.
  3. Keep the modern set: `"owner"`, `"admin"`, `"business_manager"`, `"support_staff"`, `"product_manager"`, `"viewer"` (or whatever the current modern set is — confirm against the file).
- **Done when:** `typecheck -w @store/db` passes; any UI consumer that listed the legacy roles is updated to the new set (see T1.16).
- **Order constraint:** **schema change ships in the same migration commit as T1.23**, never alone.
- **PLAN ref:** §10 (User), Appendix C § User collection.
- **Resume note:** —

#### T1.9 ActivityEntry enum cut

- **Goal:** Drop dead resource types from `ACTIVITY_RESOURCE_TYPES`.
- **Files:** `packages/db/src/models/ActivityEntry.ts`.
- **Steps:**
  1. Remove `"media"` and `"conversation"` from the enum.
  2. Keep the modern set per PLAN.md Appendix A § ActivityEntry.
- **Order constraint:** ships with the migration step T1.23 (which rewrites old activity rows). Never alone.
- **Done when:** `typecheck -w @store/db` passes.
- **PLAN ref:** §10 (ActivityEntry), Appendix C § ActivityEntry.
- **Resume note:** —

#### T1.10 Offer model: hex color + auto slug

- **Goal:** Replace `accentColor` enum with hex `color`; auto-slugify.
- **Files:** `packages/db/src/models/Offer.ts`.
- **Steps:**
  1. Drop `accentColor` enum field. Add `color: string` (hex, validator `/^#[0-9a-f]{6}$/i`).
  2. Make `slug` auto-generated from `title` via pre-save hook; remove any UI that manually sets it.
- **Order constraint:** ships with migration step T1.23 (color backfill).
- **Done when:** `typecheck -w @store/db` passes.
- **PLAN ref:** §10 (Offer), Appendix C § Offer.
- **Resume note:** —

#### T1.11 Setting model — add `chat.*` keys

- **Goal:** Add the seven chat settings keys to the default bootstrap so they're queryable from day one. `chat.enabled` is the master kill switch read by the storefront FAB shell (T8.11) — when false, the storefront ships zero chat-widget markup and zero widget JS.
- **Files:** `packages/db/src/models/Setting.ts`, `packages/db/src/bootstrap.ts`.
- **Steps:**
  1. In `bootstrap.ts`, add to the default settings array:
     - `chat.enabled` = `true` (**master switch — when false, the FAB doesn't render at all; PLAN.md Appendix D § D.2 Phase 8 Risk #3**)
     - `chat.liveModeEnabled` = `false`
     - `chat.websocketUrl` = `""`
     - `chat.pollIntervalMsFocused` = `5000`
     - `chat.pollIntervalMsBlurred` = `30000`
     - `chat.guestThreadTokenDays` = `90`
     - `chat.attachmentsEnabled` = `false`
  2. Bootstrap should `upsert` so existing prod DBs gain these keys on next deploy.
- **Done when:** running `npm run dev:admin` with a fresh dev DB shows these seven rows in the `settings` collection.
- **PLAN ref:** §12.4.
- **Resume note:** —

### Group B — Code consumers

#### T1.12 Update admin serializers

- **Goal:** Bring every serializer under `apps/admin/src/lib/serializers/` in line with the new shapes.
- **Files:** `apps/admin/src/lib/serializers/{brand,category,grade,attribute,product,user,order}.ts` (and others as needed).
- **Steps:**
  1. Open each serializer; remove fields that no longer exist on the model; add the new ones (e.g. `Grade.notes`, `Grade.color`, `Grade.video`).
  2. For Inquiry, write a new `serializers/inquiry.ts` that emits `{ id, customerId, customerName, phoneNumber, subjectProductId?, subjectProductName?, status, assignedToUserId?, lastMessageAt, lastMessagePreview, lastMessageAuthor, unreadByCustomer, unreadByTeam, messages: [...] }`. Strip `internalNotes` unless the caller passes a `includeInternal: true` flag.
  3. Delete `serializers/conversation.ts` and `serializers/mediaAsset.ts` if they still exist (they're in git status as deleted, confirm).
- **Done when:** `typecheck -w @store/admin` passes; serializer outputs match PLAN.md §10 interfaces 1:1.
- **PLAN ref:** §10.
- **Resume note:** —

#### T1.13 Update storefront serializers

- **Goal:** Same exercise for `apps/web/src/lib/storefront/serializers.ts` and `orderSerializer.ts`.
- **Files:** `apps/web/src/lib/storefront/serializers.ts`, `apps/web/src/lib/storefront/orderSerializer.ts`.
- **Steps:**
  1. Update Product/Variant serializers to emit the new shape: `images` instead of `imageUrls`, `gradeSlug` instead of `grade`, dynamic `attributes` instead of typed fields.
  2. Update Grade serializer to emit `notes`, `color`, `video`.
  3. Update Category serializer to drop legacy fields.
- **Done when:** `typecheck -w @store/web` passes.
- **PLAN ref:** §10, §7 (Flow E).
- **Resume note:** —

#### T1.14 Update admin API validation

- **Goal:** API-level validation matches the new schemas. Critically, replace the `CONDITION_GRADES` enum check with a runtime `Grade` lookup.
- **Files:** `apps/admin/src/lib/api/variantValidation.ts`, `apps/admin/src/lib/api/fieldLimits.ts`, `apps/admin/src/lib/api/attributesPayload.ts` (new), and every route under `apps/admin/src/app/api/`.
- **Steps:**
  1. **`variantValidation.ts`** — replace `ALLOWED_GRADES` constant with an async function that loads `Grade.find({ categorySlug })` and validates `gradeSlug` against the result. Add `quantity` validation (integer ≥ 0). Drop all hardcoded phone/accessory field validation; accept a generic `attributes: Record<string, string>` and validate each key against the matching `Attribute` doc's options.
  2. **`attributesPayload.ts`** (new) — helper that loads `Attribute.find({ categorySlug })` and validates a payload `attributes` object: keys are valid Attribute slugs, values are valid options for that attribute.
  3. **`products/route.ts`** — drop `releaseYear` and `accessoryType` validation. Accept `variants[]` array for atomic create.
  4. **`brands/route.ts`** + **`brands/[id]/route.ts`** — drop `tagline` validation.
  5. **`categories/route.ts`** + **`categories/[id]/route.ts`** — drop `pluralLabel`, `pathSegment`, `trustChips`, `emptyHint`, `applicableGrades`; rename `tagline` → `description`.
  6. **`grades/route.ts`** + **`grades/[id]/route.ts`** — drop `shortLabel`, `cosmeticNotes`, `functionalNotes`, `tone`, `inspectionVideoUrl`; add `notes`, `color` (hex regex), `video` (Vercel Blob URL pattern).
  7. **`attributes/route.ts`** + **`[id]/route.ts`** — drop `key`/`type`/`scope`/`sortOrder`/`unit`; add `slug` (auto), `label`, `options[]`, `cardPosition?`.
  8. **`offers/route.ts`** — replace `accentColor` validation with hex `color`.
- **Done when:** `typecheck -w @store/admin` passes; admin API smoke test (T1.18) does not regress.
- **PLAN ref:** §10, §11 (in PLAN's audit findings).
- **Resume note:** —

#### T1.15 Update storefront API validation

- **Goal:** Storefront APIs match new shapes.
- **Files:** `apps/web/src/app/api/storefront/inquiries/route.ts`, `apps/web/src/app/api/storefront/orders/route.ts`, `apps/web/src/app/api/storefront/account/addresses/route.ts`.
- **Steps:**
  1. The existing `POST /storefront/inquiries/route.ts` is being **replaced** by `POST /storefront/inquiries/start/route.ts` in Phase 8. For Phase 1, just make the existing route continue to work against the new schema: it should create an Inquiry with the structured form data as `messages[0]`. (Phase 8 will replace it entirely.)
  2. Update Order serializer/validation to consume the new Variant shape (`gradeSlug` instead of `grade`).
- **Done when:** `typecheck -w @store/web` passes; existing `/sell` form submit still creates an Inquiry (now with messages array).
- **PLAN ref:** §10, §12.5.
- **Resume note:** —

#### T1.16 Update admin UI to consume new shapes

- **Goal:** Every admin component that touches a renamed/dropped field is updated. Categories/products/inquiries pages will be **partially functional** at this stage — Phase 3 (categories workspace), Phase 4 (product create) and Phase 8 (chat inbox) finish them. Goal here is "no broken types, no console errors on load".
- **Files:** `apps/admin/src/components/ProductEditor.tsx`, `apps/admin/src/app/products/[id]/page.tsx`, `apps/admin/src/components/Settings.tsx`, `apps/admin/src/components/Inquiries.tsx` (or the renamed survivor from T0.6), `apps/admin/src/components/Offers.tsx`, `apps/admin/src/types/admin.ts`.
- **Steps:**
  1. Update `apps/admin/src/types/admin.ts` to mirror PLAN.md §10 interfaces 1:1. This is the canonical type surface for admin UI.
  2. Sweep `ProductEditor.tsx` — replace any `product.imageUrl` / `product.galleryUrls` / `product.attributes` / `product.releaseYear` / `product.accessoryType` reads with variant-derived equivalents.
  3. Sweep `Inquiries.tsx` — replace `inquiry.lastMessage` → `inquiry.lastMessagePreview`, `inquiry.modelName` → `inquiry.subjectProductName ?? "—"`, `inquiry.expectedRupees` → drop, `inquiry.source` → drop the filter chip.
  4. Sweep `Offers.tsx` — replace `accentColor` chip with hex color swatch.
  5. Run admin in dev (`npm run dev:admin`); click through every nav item; record any console error.
- **Done when:** `typecheck -w @store/admin` passes; admin loads with no console errors on `/`, `/products`, `/categories`, `/customers`, `/orders`, `/inquiries`, `/offers`, `/team`, `/settings`, `/activity`.
- **PLAN ref:** §9, §10.
- **Resume note:** —

#### T1.17 Update storefront UI partial sweep — **including the root layout reference loader**

- **Goal:** Storefront stays runnable after schema cuts. Full PDP redesign is Phase 6; this task is only "don't crash". **Critically, this includes `apps/web/src/app/layout.tsx`'s `loadStorefrontReference()` which currently reads `category.tagline`, `category.applicableGrades`, `category.trustChips`, `category.emptyHint` — fields that Phase 1 deletes. If the root layout isn't updated in the SAME commit / PR as the model changes, every visitor falls into the empty-reference fallback path and the site degrades globally.**
- **Files:**
  - `apps/web/src/app/layout.tsx` (the reference loader + the `StorefrontCategoryReference` mapping).
  - `apps/web/src/lib/storefront/storefrontReferenceContext.tsx` (the Context type — drop deleted fields).
  - `apps/web/src/components/shared/PhoneVisual.tsx`, `ProductCard.tsx`, `GradeBadge.tsx`, `GradeShowcase.tsx`.
  - `apps/web/src/data/products.ts`, `apps/web/src/lib/productSummary.ts`.
  - Any other storefront reader of cut fields (find via `rg "applicableGrades|trustChips|tagline|emptyHint|pluralLabel|pathSegment|cosmeticNotes|functionalNotes|\\.tone\\b|imageUrl\\b|galleryUrls\\b" apps/web/src`).
- **Steps:**
  1. **Root layout first.** Open `apps/web/src/app/layout.tsx`. The `categories` mapping currently emits `pluralLabel, pathSegment, tagline, applicableGrades, trustChips, emptyHint` — drop them. Update `StorefrontCategoryReference` in `storefrontReferenceContext.tsx` accordingly. Anything downstream that reads them from Context becomes a follow-up bullet here.
  2. Anywhere the storefront reads `product.imageUrl` — fall back to `product.variants[0]?.images?.[0]?.variants.card` (the `card` width is the typical legacy callsite; PDP hero uses `.variants.detail`, lightbox uses `.variants.full`). Phase 6 (T6.2) does the proper surface-aware `<ProductImage surface="...">` sweep; for now we just need the storefront to render without crashing.
  3. Anywhere it reads `product.galleryUrls` — fall back to `product.variants[0]?.images?.map(i => i.variants.card) ?? []` for the same reason.
  4. Anywhere it reads `variant.grade` — replace with `variant.gradeSlug`.
  5. Anywhere it reads `Grade.cosmeticNotes` / `functionalNotes` — replace with `Grade.notes`.
  6. Anywhere it reads `Grade.tone` — replace with `Grade.color`.
  7. Anywhere it reads `category.tagline` / `trustChips` / `applicableGrades` / `emptyHint` / `pluralLabel` / `pathSegment` — remove the reference (or temporarily wire to a placeholder; full redesign happens in Phase 6).
- **Done when:** `npm run dev:web` boots; home, a category page, and one PDP load with **zero runtime errors** (not just zero crashes — verify the layout reference data flows through Context with the new shape). `rg "tagline|trustChips|applicableGrades|emptyHint|pluralLabel|pathSegment|cosmeticNotes|functionalNotes|\\.tone\\b|imageUrl\\b|galleryUrls\\b" apps/web/src` returns zero matches. Also `rg "images\\[\\d+\\]\\.url|image\\.url(?!s)" apps/web/src` returns zero matches (the legacy `{ url, alt }` shape is gone — all reads go through `StoredImage.variants.*`).
- **PLAN ref:** §7, §10, Appendix D § D.1 (sacred infrastructure), § D.2 (Phase 1 risks).
- **Resume note:** —

#### T1.18 End-to-end manual smoke

- **Goal:** Catch anything missed by typecheck. Manual click-through.
- **Files:** none.
- **Steps:**
  1. Start both apps: `npm run dev`.
  2. Admin checklist: log in → load each list page → open one item in each (Customer, Order, Product, Inquiry, Offer) → confirm details render without console errors. Do NOT try to save anything yet (data is still in old shape until migration runs).
  3. Storefront checklist: home → category → PDP → cart → checkout shell (don't pay) → /sell → submit a test inquiry (will fail validation in some shape; that's expected before migration).
  4. Record every issue as a TODO in this task's resume note. Fix them in the appropriate task above.
- **Done when:** no `TypeError` or `ReferenceError` in console on any admin or storefront page.
- **PLAN ref:** —
- **Resume note:** —

### Group C — Migration

#### T1.19 Add `migrate` script + runner skeleton

- **Goal:** Stand up the migration runner.
- **Files:** `packages/db/package.json`, `packages/db/src/migrate.ts` (new), `packages/db/src/migrations/index.ts` (new), `packages/db/src/migrations/simplification-v1.ts` (new — stub).
- **Steps:**
  1. Add `"migrate": "node --import tsx ./src/migrate.ts"` to `packages/db/package.json` scripts. Install `tsx` as a devDependency.
  2. Create `migrate.ts` that:
     - Reads `RUN_MIGRATIONS` env (default false → exit with a message).
     - Connects DB via the existing `connectDB`.
     - Checks the `migrations` collection for `{ key: "simplification-v1" }` — if present, exits "already applied".
     - Otherwise runs the migration logic from `migrations/simplification-v1.ts`.
     - On success, inserts the marker `{ key: "simplification-v1", appliedAt: new Date() }`.
  3. The migration file is a stub for now — empty function. T1.20–T1.23 fill it in.
- **Done when:** running `RUN_MIGRATIONS=true npm run migrate -w @store/db` against a dev DB exits with "would run simplification-v1 (no-op stub)". Running it a second time exits with "already applied".
- **PLAN ref:** §12, Appendix C.
- **Resume note:** —

#### T1.20 Migration: Snapshot Inquiry product names, then restructure messages

- **Goal:** Before the catalog wipe destroys product names, snapshot them onto every Inquiry that references a product; then convert every legacy Inquiry into a threaded doc.
- **Files:** `packages/db/src/migrations/simplification-v1.ts`.
- **Steps:**
  1. **Snapshot pass (must run BEFORE T1.21):** for every Inquiry with a non-null `productId`, look up `Product.findById(productId).select("modelName name")` and write `subjectProductName = product.modelName || product.name`. This preserves human context even though the FK will be nulled below.
  2. **Message restructure:** helper `composeLegacyFirstMessage(doc)` formats `modelName`, `variantSummary`, `expectedRupees`, and `lastMessage` into a single body string. For each Inquiry doc:
     ```
     messages = [{
       author: "customer",
       authorName: doc.customerName,
       body: composeLegacyFirstMessage(doc),
       createdAt: doc.receivedAt ?? doc.createdAt,
     }]
     lastMessageAt = doc.receivedAt ?? doc.createdAt
     lastMessagePreview = body.slice(0, 140)
     lastMessageAuthor = "customer"
     unreadByCustomer = 0
     unreadByTeam = 1
     status = STATUS_MAP[doc.status]    // new/in-progress → open; won/lost → resolved
     internalNotes = doc.notes
     subjectProductId = doc.productId   // will be nulled in T1.21 cross-ref pass
     ```
  3. `$unset: { modelName, variantSummary, expectedRupees, source, receivedAt, lastMessage, customerCity, productId, notes }`.
  4. Log count.
- **Done when:** dev DB Inquiries have `messages[]` populated, `subjectProductName` snapshotted, and legacy fields gone.
- **PLAN ref:** §12.10, Appendix C § Inquiry collection.
- **Resume note:** —

#### T1.21 Migration: Catalog wipe + cross-reference cleanup

- **Goal:** Drop the catalog collections (admin recreates from scratch via Flow A and Flow C) and null out the now-dangling references.
- **Files:** `packages/db/src/migrations/simplification-v1.ts`.
- **Steps:**
  1. **Drop catalog collections:**
     ```
     await Product.deleteMany({});
     await Brand.deleteMany({});
     await Category.deleteMany({});
     await Grade.deleteMany({});
     await Attribute.deleteMany({});
     ```
     Log delete counts for the audit trail.
  2. **Cross-reference cleanup:**
     ```
     await Inquiry.updateMany(
       { subjectProductId: { $exists: true, $ne: null } },
       { $set: { subjectProductId: null } },
     );
     ```
     The `subjectProductName` from T1.20 stays, so chat threads still show context.
  3. **ActivityEntry rows** that reference deleted entities keep their `resourceLabel` (human-readable); their `resourceId` becomes a dangling pointer but admin activity-log UI never resolves it, so no break.
  4. **Wishlist / cart:** stored client-side in `apps/web/src/lib/{wishlist,cart}/store.ts`. No DB action. Phase 6 (storefront) confirms the render-side filter for missing products exists; if not, that's a one-line fix in Phase 6.
- **Done when:** `Product.countDocuments() === 0` (and same for the other four catalog collections); existing Inquiries still load in the admin inbox showing `subjectProductName` as "no longer in catalog" hint.
- **PLAN ref:** §1 (Cold start), Appendix C § Catalog wipe.
- **Resume note:** —

#### T1.22 Migration: User, ActivityEntry, Offer reshape

- **Goal:** Backfill the preserved-but-tightened collections before their schema enums lock down.
- **Files:** `packages/db/src/migrations/simplification-v1.ts`.
- **Steps:**
  1. **User:** rewrite `role ∈ { "manager", "staff", "media_manager" }` → modern equivalents (`business_manager`, `support_staff`, `product_manager`). Must run before T1.8's schema change deploys.
  2. **ActivityEntry:** rewrite `resourceType ∈ { "media", "conversation" }` → `"settings"` (closest neutral bucket); prefix `resourceLabel` with `[Legacy media]` / `[Legacy conversation]` to preserve provenance.
  3. **Offer:** rewrite `accentColor: "emerald" | "amber" | "rose" | "sky"` → hex via `ACCENT_TO_HEX` lookup. `$unset: { accentColor }`.
- **Done when:** all three collections pass validation under the tightened enums.
- **PLAN ref:** Appendix C § User, ActivityEntry, Offer.
- **Resume note:** —

#### T1.23 Migration: run on staging clone, then production

- **Goal:** Execute the migration safely against real data.
- **Files:** —
- **Steps:**
  1. Confirm PF.2's backup exists.
  2. **Staging dry-run:** restore the backup into a fresh Atlas cluster (`mongorestore --uri="$STAGING_MONGODB_URI" ./backups/<date>`). Point a local dev build at it. Run `RUN_MIGRATIONS=true npm run migrate -w @store/db`. Smoke-test both apps against the staging clone. Record any data issues.
  3. **Fix any issues** by amending the migration code (idempotent — re-running on staging works because the marker collection on staging can be wiped between runs).
  4. **Production:** during a low-traffic window, set `RUN_MIGRATIONS=true` for one deploy, deploy, watch logs, confirm marker is set, unset `RUN_MIGRATIONS` for the next deploy.
  5. Run admin + storefront smoke on prod.
- **Done when:** prod migration log shows success counts for each collection; `migrations` collection has the `simplification-v1` marker with `appliedAt` timestamp; both apps work against the migrated data.
- **PLAN ref:** Appendix C § Safety steps.
- **Resume note:** —

**Phase 1 exit criteria:**

- `npm run typecheck` + `npm run lint` green across the workspace.
- Admin loads every page without console errors. `/categories`, `/products`, and any other catalog-driven page renders an empty-state ("No categories yet — create one") because the catalog was wiped. That's expected; Phase 3 builds the authoring UI.
- Storefront loads home / category / cart shell / /sell without console errors. Category pages and search show empty-state "Catalog refresh in progress" until Phase 3+4 are merged. **Tip:** keep storefront in maintenance mode (a banner) until Phase 6 ships, since real customers can't shop with no catalog.
- `migrations` collection in prod DB contains `{ key: "simplification-v1", appliedAt: <date> }`.
- Catalog collections are empty: `db.products.countDocuments() === 0`, same for brands / categories / grades / attributes.
- A spot check on 5 random inquiries confirms they have `messages[0]` populated, no `lastMessage` string, and `subjectProductName` snapshot is present (`subjectProductId` is `null`).
- Customers / orders / users / settings / loyalty are untouched (`db.customers.countDocuments()` matches the pre-migration baseline from PF.1).
- **Perf checkpoint (PLAN.md Appendix D § D.4):** `rg "applicableGrades|trustChips|tagline|emptyHint|pluralLabel|pathSegment|cosmeticNotes|functionalNotes|\\.tone\\b|imageUrl\\b|galleryUrls\\b" apps/web/src` returns 0 matches (no storefront crash on cold load). `bustAdminCaches()` is still called by every preserved admin mutation route. Storefront bundle delta vs PF.4 baseline = +0 (this phase is pure removal). Lighthouse mobile PDP LCP unchanged within ±50ms (PDP renders the empty/maintenance state; the cache layer is intact).

Squash-merge `phase-1-schema` into `main`. **Tag the commit `v0.2.0-schema-wipe`** so you have a known-good rollback point before later phases. **Important:** keep the storefront in maintenance mode through Phases 3 → 4 → 6 — there's no catalog to shop until Phase 4 lets the admin create products, and the storefront PDP/category pages don't fully consume the new shape until Phase 6.

---

## Phase 2 — Image / video uploads (Vercel Blob)

> Pure new-feature work. No schema changes. Unblocks Phase 3 (categories workspace needs VideoUpload for grades and ImageGallery for category icons), Phase 4 (product create needs ImageGallery for variants), Phase 5 (variant editor needs it), Phase 8.5 (chat attachments need it).

### T2.1 Install storage + image dependencies, configure env

- **Goal:** Add `@vercel/blob` + `sharp` dependencies, set the storage-provider switch + Blob token env. `sharp` is the de facto Node image library and the engine behind the variant generator in T2.2.
- **Files:** `apps/admin/package.json`, `apps/web/package.json`, `packages/shared/package.json` (declares sharp as a peer dep so the storage abstraction can hint at it), `turbo.json`, `.env.local`, `.env.example` (if it exists; create if not), `apps/admin/next.config.ts`, `apps/web/next.config.ts`.
- **Steps:**
  1. `npm install @vercel/blob sharp -w @store/admin`. Storefront doesn't need them (it only reads URLs).
  2. Confirm `sharp` resolves cleanly: `node -e "console.log(require('sharp').versions)"` should print without native-binding errors. (Node 22 + macOS / Linux: prebuilt binaries exist; nothing to compile.)
  3. Add `BLOB_READ_WRITE_TOKEN` AND `STORAGE_PROVIDER` to `turbo.json` `globalEnv` (so turbo cache invalidates correctly when they change).
  4. Add to `.env.local`:
     - `BLOB_READ_WRITE_TOKEN=...` (real token from Vercel Storage dashboard).
     - `STORAGE_PROVIDER=vercel-blob` (the default; the storage-provider resolver in T2.1.5 reads this).
     - **Do not commit.**
  5. Add to `.env.example`: `BLOB_READ_WRITE_TOKEN=` and `STORAGE_PROVIDER=vercel-blob` so onboarding is documented.
  6. **Both `next.config.ts` files:** add `{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }` to `images.remotePatterns`. Add `https://*.public.blob.vercel-storage.com` to the CSP `img-src` directive. (Forward-thinking: when S3 lands, add the CloudFront domain at the same two spots — no other changes needed because the URLs come back from `StorageProvider.put()`.)
  7. **`serverExternalPackages` in `apps/admin/next.config.ts`:** add `"sharp"` so Webpack doesn't try to bundle the native binary.
- **Done when:**
  - `npm run typecheck` passes.
  - `process.env.BLOB_READ_WRITE_TOKEN` is readable from a Next.js API route.
  - A throwaway script in `apps/admin/scripts/test-sharp.ts` does `sharp(buffer).resize(480).webp({ quality: 78 }).toBuffer()` against a sample image and outputs a WebP without crashing. Script deleted before commit.
  - View-source on any admin page shows the CSP `img-src` includes the Blob host.
- **PLAN ref:** §1 (locked decisions — image variants + storage abstraction), Appendix B (storage files), Appendix D § D.2 (Phase 2 risks).
- **Resume note:** —

### T2.1.5 StorageProvider abstraction (Vercel Blob impl + S3 stub)

- **Goal:** Define the `StorageProvider` interface and ship the Vercel Blob implementation today, plus a no-op S3 stub. When the S3 migration happens, only `s3Provider.ts` needs a real body + an env flip — every consumer of the upload route stays untouched.
- **Files:** `packages/shared/src/storage/index.ts`, `packages/shared/src/storage/types.ts`, `packages/shared/src/storage/vercelBlobProvider.ts`, `packages/shared/src/storage/s3Provider.ts`, `packages/shared/src/index.ts` (barrel).
- **Steps:**
  1. **`types.ts`:**
     ```ts
     export interface StoredImage {
       variants: { thumb: string; card: string; detail: string; full: string };
       blurDataURL: string;
       width: number;
       height: number;
       alt: string;
     }
     export interface StorageProvider {
       put(key: string, body: Buffer, contentType: string): Promise<string>; // returns public URL
       remove(key: string): Promise<void>;
     }
     export type StorageProviderName = "vercel-blob" | "s3";
     ```
     This is the `StoredImage` shape that T1.6 already references — Phase 1 forward-declares it; Phase 2 fills in the implementation.
  2. **`vercelBlobProvider.ts`:** `export const vercelBlobProvider: StorageProvider` whose `put` wraps `@vercel/blob`'s `put(key, body, { access: "public", contentType })` and returns `result.url`; whose `remove` wraps `del(url)`.
  3. **`s3Provider.ts`:** export a `StorageProvider` whose methods throw `new Error("S3 storage provider not yet implemented — set STORAGE_PROVIDER=vercel-blob")`. A clean error is better than silent failure. Wire the real `@aws-sdk/client-s3` impl when the S3 migration phase lands.
  4. **`index.ts`:** export a `resolveStorageProvider(): StorageProvider` that reads `process.env.STORAGE_PROVIDER` (default `"vercel-blob"`) and returns the matching impl. Throws on unknown values. Also re-export `StoredImage`, `StorageProvider`.
  5. **Barrel:** re-export from `packages/shared/src/index.ts`.
- **Done when:**
  - `import { resolveStorageProvider, StoredImage } from "@store/shared"` works from `@store/admin`.
  - In a throwaway script: `const p = resolveStorageProvider(); await p.put("test/hello.txt", Buffer.from("hi"), "text/plain")` returns a `vercel.app` URL; `p.remove(url)` succeeds.
  - With `STORAGE_PROVIDER=s3` set, `resolveStorageProvider()` returns the stub; calling `.put()` throws the descriptive error.
- **PLAN ref:** §1 (storage-provider abstraction), §10 (StoredImage), Appendix B.
- **Resume note:** When the S3 migration starts, T2.1.5 is where you re-open and replace the stub body. Nothing else in the plan touches `s3Provider.ts`.

### T2.2 Upload API route — generate variants + blurhash, return `StoredImage`

- **Goal:** Server-side upload endpoint that runs every image through `sharp` once, generating four pre-sized WebP variants + a base64 blurhash + extracting dims. Returns a fully-formed `StoredImage` the caller can persist directly into `Variant.images[]`. The original is discarded after processing — only the variants live in storage. See PLAN §10 (StoredImage), Appendix D § D.2 (Phase 2 risks + variant byte ceilings), Appendix D § D.3 (image budget table).
- **Files:** `apps/admin/src/app/api/uploads/route.ts`, `apps/admin/src/lib/uploads/limits.ts`, `apps/admin/src/lib/uploads/processImage.ts`.
- **Steps:**
  1. `limits.ts` exports:
     - `MAX_IMAGE_MB = 12` (raised from 8 — admin uploads from phone cameras hit 8–10 MB; the variant generator caps the output anyway).
     - `MAX_SOURCE_DIMENSION = 4000` (reject inputs > 4000px on either axis — sharp can handle them, but it's a sanity guard).
     - `MAX_VIDEO_MB = 64`.
     - `ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"]`.
     - `ALLOWED_VIDEO_MIME = ["video/mp4", "video/webm"]`.
     - `IMAGE_VARIANT_WIDTHS = { thumb: 160, card: 480, detail: 1080, full: 2400 } as const`.
     - `WEBP_QUALITY = 78`, `WEBP_EFFORT = 4` (sharp's defaults are close; effort=4 is a good speed/size balance).
     - `BLURHASH_DIMENSION = 32` (32×32 source for the blur placeholder; results in ~180-byte data URL).
  2. **`processImage.ts`** exports `processImage(buffer: Buffer, keyPrefix: string, suggestedAlt: string, storage: StorageProvider): Promise<StoredImage>`:
     1. `sharp(buffer).metadata()` → grab `width`, `height`, `format`. Reject if either dimension > `MAX_SOURCE_DIMENSION`.
     2. **Variants:** for each entry in `IMAGE_VARIANT_WIDTHS`, run:
        ```ts
        const out = await sharp(buffer)
          .rotate() // auto-rotate based on EXIF, then strip EXIF below
          .resize({ width, withoutEnlargement: true }) // never upscale; full = original if smaller
          .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
          .toBuffer();
        const url = await storage.put(`${keyPrefix}/${name}-${nanoid(8)}.webp`, out, "image/webp");
        ```
        Run the four resizes in parallel via `Promise.all`. Total wall time ~150–300 ms per source image on a Vercel function.
     3. **blurDataURL:** `await sharp(buffer).resize(BLURHASH_DIMENSION).webp({ quality: 40 }).toBuffer()` → `"data:image/webp;base64," + buffer.toString("base64")`. Result should be ≤ 300 bytes.
     4. Return `{ variants: { thumb, card, detail, full }, blurDataURL, width, height, alt: suggestedAlt }`.
  3. **`route.ts`:** POST handler.
     1. Auth via `requireSession`.
     2. Parse `multipart/form-data`. Validate size (`<= MAX_IMAGE_MB * 1024 * 1024`) + MIME.
     3. Read the optional `altSeed` form field (e.g. `"<product name> · <grade label>"`). The caller (T2.3 ImageGallery) appends ` · image <N>` per file index before sending.
     4. Resolve storage: `const storage = resolveStorageProvider();`. Build key prefix: `<resource>/<sub-id>` (passed in `kind` + `subjectId` form fields, e.g. `kind=product, subjectId=<draft-id>`). Falls back to `uploads/${date}` if not provided.
     5. Call `processImage(buffer, keyPrefix, altSeed, storage)`. Return the `StoredImage` object.
     6. For VIDEO uploads (Grade.video — T2.4), bypass `processImage` and just `storage.put` the original. Return `{ url, contentType, sizeBytes }` shape (videos don't have variants).
  4. Rate limit per session: max 30 uploads / minute (use existing rate-limit helper).
  5. **Cleanup on failure:** if one of the 4 variant puts fails mid-stream, the upload route catches and best-effort `storage.remove`s the variants that did succeed (so we don't leak orphans on partial failure). Log + return 500.
- **Done when:**
  - POSTing a sample 2400×1600 JPEG returns a `StoredImage` whose four `variants.*` URLs are reachable and serve WebPs at the expected widths (`curl -I <url>` + `Content-Type: image/webp`).
  - Variant byte sizes are within the budgets in PLAN.md Appendix D § D.3: `thumb` ≤ 15 KB, `card` ≤ 60 KB, `detail` ≤ 200 KB, `full` ≤ 600 KB (for a typical product photo; obviously a 99% solid-color image could be smaller).
  - `blurDataURL` is ≤ 300 bytes.
  - `width`, `height` reflect the source dimensions.
  - Total request wall time p95 < 4s end-to-end for a 12 MB source.
  - Non-admin requests get 401. Oversized requests get 413. Wrong MIME gets 415.
- **PLAN ref:** Appendix B (new files), §5, §10 (StoredImage), §13.2, Appendix D § D.2 + § D.3.
- **Resume note:** —

### T2.3 ImageGallery + ImageUpload components — the only two image inputs in the entire app

- **Goal:** Two reusable image inputs that every authoring surface in the admin uses — there is no third image input. **`<ImageGallery>`** handles ordered multi-image fields (`Variant.images`, future variant-attachment gallery, Phase 8.5 chat image gallery): upload + sort + hero-select + per-image alt-text editing + remove + zoom-preview. **`<ImageUpload>`** handles single-image fields (`Category.iconImage`, `Offer.bannerImage`, `Setting.store.logo`, `Setting.store.favicon`, `Setting.seo.ogImageDefault`, future user avatar): upload + remove + zoom-preview. Both operate on `StoredImage` end-to-end (no `string` legacy, no per-entity bespoke upload widget) and both POST to the same `/api/uploads` route.
- **Files:** `apps/admin/src/components/uploads/ImageGallery.tsx`, `apps/admin/src/components/uploads/ImageUpload.tsx`, `apps/admin/src/components/uploads/ImageGalleryThumb.tsx`, `apps/admin/src/components/uploads/Lightbox.tsx`.
- **Steps:**
  1. Props:
     ```ts
     interface ImageGalleryProps {
       value: StoredImage[];
       onChange: (images: StoredImage[]) => void;
       altSeed?: string;  // e.g. "<product name> · <grade label>"; gallery appends " · image <N>"
       maxImages?: number;  // default 8
       keyPrefix?: string;  // e.g. "products/<id>/variants/<v-id>"; sent to upload route
     }
     ```
  2. Render a grid of thumbs using `<Image src={image.variants.thumb} width={image.width} height={image.height} alt={image.alt} placeholder="blur" blurDataURL={image.blurDataURL} />`. The first is the "hero" (badge with a star icon).
  3. Drag-reorder via HTML5 DnD; on drop, reorder `value` and emit through `onChange`.
  4. Click the `x` icon on a thumb: best-effort `fetch("/api/uploads/remove", { method: "POST", json: { urls: Object.values(image.variants) } })` (best-effort — don't block UI on failure) then splice from `value`.
  5. Click "Add": file picker (multiple allowed) → for each file, POST to `/api/uploads` with `altSeed = \`${propsAltSeed} · image ${currentIndex + i + 1}\`` and `keyPrefix`. Show upload progress bar per file. On 200, push the returned `StoredImage` into `value`. On failure, toast + reject just that one file.
  6. Each thumb has an "Alt" pill below it (or in a hover-popover on larger screens). Click → inline editable input. Editing updates `value[i].alt`. A subtle amber dot appears on thumbs with empty alt; a green check appears on thumbs whose alt contains the product / focus-keyword hint from `altSeed`.
  7. Click the thumb body (not the alt pill, not the `x`) → open `<Lightbox>` showing `variants.full`. Lightbox uses keyboard arrows for prev/next.
  8. Mobile: gallery becomes a horizontal scroller; the "Add" button is sticky on the right.
  9. **`<ImageUpload>` (single-image counterpart).** Props:
     ```ts
     interface ImageUploadProps {
       value: StoredImage | null;
       onChange: (image: StoredImage | null) => void;
       altSeed?: string;          // e.g. "Phones category icon"
       keyPrefix?: string;        // e.g. "categories/<slug>/icon"
       aspect?: "square" | "wide" | "free";  // pure UI hint for the dropzone aspect-ratio
     }
     ```
     - Empty state: dropzone showing dimensions ("Recommended: 800×800 PNG / WebP") + click-to-upload.
     - Filled state: thumbnail (`variants.card` width) + "Replace" button + "Remove" button + an "Alt" input below.
     - POSTs to the same `/api/uploads` route as `<ImageGallery>`.
     - On `onChange(null)`, best-effort `fetch("/api/uploads/remove", ...)` for the four variant URLs.
- **Done when:** sample page (throwaway in `/app/(playground)/test-gallery/page.tsx`) lets you:
  - **`<ImageGallery>`:** upload 3 images. Each round-trip returns a full `StoredImage`. The grid shows blurhash placeholders for ~50–100ms then the real thumbs.
  - See auto-filled alt text mentioning the product name / grade.
  - Edit one alt — value persists in component state.
  - Reorder via drag.
  - Set a new hero (drag to position 0; the badge moves).
  - Click a thumb → lightbox opens with the `full` variant; arrow keys navigate.
  - Remove one — its four variants are deleted from Blob (verified in Blob dashboard).
  - **`<ImageUpload>`:** upload one image. Round-trip returns a full `StoredImage`. Dropzone shows blurhash placeholder briefly then the real thumb.
  - Click "Replace" → file picker reopens; new upload replaces and removes the old four variants from Blob.
  - Click "Remove" → state clears to `null` and the four variants are deleted from Blob.
  - **Single-uploader rule:** `rg --type=tsx "ImageUploader|UploadInput|FileUpload|ImagePicker|UploadField"` returns no NEW components outside `apps/admin/src/components/uploads/` — only `ImageGallery` and `ImageUpload` are allowed as image entry points across the app.
  - Throwaway page deleted before commit.
- **PLAN ref:** §1 (universal image schema), §10 (image-field inventory), Appendix B, §13.2, Appendix D § D.2.
- **Resume note:** A small `/api/uploads/remove` POST is implied — minimal route, auth + same `resolveStorageProvider()` + a `storage.remove` per URL. Add it as part of this task; it's < 30 lines. **Downstream consumers of `<ImageUpload>`:** T3.4 (Category drawer icon picker — emoji input OR `<ImageUpload>` toggled by `iconKind`), T3.10 (Offer banner editor — `<ImageUpload>` with `aspect="wide"`), and the Settings → Store info section (logo / favicon / OG image, each one `<ImageUpload>` instance). T8.5+ (Phase 8.5 chat image attachments) reuses `<ImageGallery>` in a smaller variant.

### T2.4 VideoUpload component

- **Goal:** Single-file video upload for `Grade.video`.
- **Files:** `apps/admin/src/components/uploads/VideoUpload.tsx`.
- **Steps:**
  1. Props: `value: string`, `onChange: (url: string) => void`.
  2. If empty: show "Upload demo video" button → file picker → POST `/api/uploads` (with `kind: "video"` query so the route picks the right limits) → set value.
  3. If set: render a `<video controls>` with a "Replace" + "Remove" overlay.
- **Done when:** uploading an MP4 yields a playable preview; remove clears the value.
- **PLAN ref:** Appendix B.
- **Resume note:** —

### T2.5 Wire ImageGallery into existing editors (smoke) + verify storefront rendering

- **Goal:** Confirm the gallery works against real data before Phases 3 / 4 / 5 / 6 depend on it. Also verify storefront `<Image>` callsites can consume `StoredImage` cleanly (picks the right variant, uses `blurDataURL`).
- **Files:** `apps/admin/src/components/ProductEditor.tsx` (or its variant editor section), `apps/web/src/components/shared/ProductImage.tsx` (the existing storefront image wrapper).
- **Steps:**
  1. Admin side: pick one place where the editor currently expects an image URL. Replace with `<ImageGallery value={variant.images} onChange={...} altSeed={\`${product.name} · ${grade.label}\`} keyPrefix={\`products/${product.id}/variants/${variant.id}\`} />`. Save → reload → confirm the four variant URLs round-trip and persist correctly.
  2. Storefront side: open `ProductImage.tsx`. Refactor it to accept a `StoredImage` (or array + index) instead of a single URL. Internally it picks the variant based on a `surface` prop:
     ```ts
     interface ProductImageProps {
       image: StoredImage;
       surface: "card" | "detail" | "full" | "thumb";
       sizes: string;
       priority?: boolean;
     }
     ```
     and renders `<Image src={image.variants[surface]} width={image.width} height={image.height} alt={image.alt} placeholder="blur" blurDataURL={image.blurDataURL} sizes={sizes} priority={priority} />`.
  3. Replace any direct `<Image src={someUrl}>` in storefront product surfaces with `<ProductImage image={...} surface={...} sizes={...} />`. (Full sweep is Phase 6 T6.2; this task is just the wiring scaffolding so a smoke product renders.)
  4. **Non-product image surfaces.** Confirm `<ImageUpload>` (single-image counterpart from T2.3) is the entry point for every non-variant image field by adding throwaway test mounts:
     - Category icon picker (in a stub of T3.4): toggle `iconKind` between `emoji` and `image`; when `image`, mount `<ImageUpload>` and confirm save round-trips `category.iconImage` as `StoredImage`.
     - Settings store info (stub of T3.10): mount three `<ImageUpload>` instances for `store.logo`, `store.favicon`, `seo.ogImageDefault`; confirm each saves as `StoredImage` under the right Setting key.
     - Offer banner (stub of T3.10): mount one `<ImageUpload aspect="wide">` for `offer.bannerImage`; confirm save round-trips as `StoredImage`.
     Each smoke just needs to verify the upload pipeline + persistence; the proper editor wiring lives in Phase 3 tasks.
  5. **Sacred-asset check:** the storefront `next/image` config (`minimumCacheTTL: 3600`, `remotePatterns`) MUST NOT be removed — variant URLs still flow through the optimizer for CDN caching + format negotiation.
- **Done when:**
  - An admin can upload a 10-image variant through the gallery (paste form into a "draft product" route or wire to the existing ProductEditor).
  - After save+reload, the JSON in Mongo shows each image as a full `StoredImage` with 4 `variants.*` URLs + `blurDataURL` + dims + alt.
  - A throwaway storefront page (`/app/(playground)/test-pdp`) renders the same variant's images: the card surface shows the `card` variant, the lightbox shows the `full` variant, and `view-source:` confirms the `blurDataURL` is inlined in HTML.
  - Throwaway pages deleted before commit.
- **PLAN ref:** Appendix B, §5, §10 (StoredImage).
- **Resume note:** —

**Phase 2 exit criteria:** Upload endpoint generates 4 variants + blurhash + dims; ImageGallery works in production-shape data; VideoUpload works against a Grade. **Perf checkpoint (PLAN.md Appendix D § D.2 / Phase 2 + § D.3 image budgets):**

- (a) `next.config.ts` in BOTH `apps/admin` and `apps/web` includes `{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }` in `images.remotePatterns`; the CSP `img-src` directive in BOTH `next.config.ts` files includes `https://*.public.blob.vercel-storage.com`. Verified by uploading a real image and confirming (i) it loads via `/_next/image?url=...` (Next.js optimizer pathway, not direct) and (ii) DevTools Console shows no CSP violation.
- (b) `sharp` listed in `serverExternalPackages` in `apps/admin/next.config.ts`.
- (c) Upload a 12 MB, 4000×3000 source JPEG. Inspect the returned `StoredImage`:
  - `variants.thumb` ≤ 15 KB.
  - `variants.card` ≤ 60 KB.
  - `variants.detail` ≤ 200 KB.
  - `variants.full` ≤ 600 KB.
  - `blurDataURL` ≤ 300 bytes.
  - `width` and `height` reflect the source.
  - Upload route p95 < 4 s end-to-end (measure via DevTools Timing across 5 uploads).
- (d) `STORAGE_PROVIDER=s3` env causes the stub provider to throw a descriptive error rather than silently failing — confirms the abstraction is wired correctly.
- (e) Bundle delta vs PF.4 baseline: storefront unchanged (this phase is admin-only on the JS side; storefront only gains the `ProductImage` shape refactor whose bundle impact is < 1 KB). Admin `/products` first-load JS within +5 KB.

Squash-merge `phase-2-uploads`.

---

## Phase 3 — Categories workspace (Flow A) + shared visuals + live previews

> Builds `/categories` from scratch (Flow A in PLAN.md §3): a grid of category cards where every dependent entity (brands, grades, attributes) is authored inline or via drawers. Adds the **shared storefront-visual** layer (`packages/shared/src/storefrontVisuals/`) so admin previews and storefront use the same components. Adds the **live-preview wrappers** that pair each authoring drawer with a real-time storefront-styled card.
>
> Hard prerequisite: Phase 1 (the catalog is empty; this phase is how the admin first populates it).

### T3.1 Shared storefront visuals — extract pure-presentation components (full surface)

- **Goal:** Move (or create) pure-presentation versions of every storefront surface that an admin entity appears on into `packages/shared/src/storefrontVisuals/`. No router, no session, no data fetching inside. This is the **backing library for the preview matrix** (PLAN.md §9 → Live preview matrix). Anywhere a customer sees a brand chip / grade badge / attribute group / product card / variant chip, the admin must be able to render the same component with form state.
- **Files** (per PLAN Appendix B § Shared storefront visuals):
  - `packages/shared/src/storefrontVisuals/index.ts` (barrel)
  - `CategoryCard.tsx`, `CategoryHeader.tsx`, `CategoryNavChip.tsx`
  - `BrandChip.tsx`, `BrandFilterRow.tsx`
  - `GradeBadge.tsx`, `GradeCard.tsx`, `GradeFilterPill.tsx`
  - `AttributeChip.tsx`, `AttributeFilterGroup.tsx`
  - `ProductCard.tsx`, `SearchResultRow.tsx`
  - `VariantChip.tsx`, `PdpHero.tsx`
  - `OfferBanner.tsx`, `OfferChip.tsx`
  - `StorefrontHeaderPreview.tsx`, `StorefrontFooterPreview.tsx`
  - `ChatFabShellPreview.tsx`
- **Steps:**
  1. For each component, identify the storefront source if one already exists. Extract the rendering JSX + `props` interface to `packages/shared/src/storefrontVisuals/<Name>.tsx`. **Strip** any `Link`, `useRouter`, `useSession`, or data-fetching usage — components receive everything they need via props.
  2. Where the storefront version wraps content in a `<Link>`, accept an optional `wrapper?: (children: ReactNode) => ReactNode` prop and default to identity. Storefront passes `(children) => <Link href={...}>{children}</Link>`; admin previews pass nothing.
  3. For components that didn't previously exist as a discrete pure-presentation file (e.g. the `CategoryHeader`, `BrandFilterRow`, `GradeFilterPill`), build them now as small standalone components — they'll be consumed both by the storefront (replacing inline JSX) and by the admin matrix.
  4. Re-export everything from `index.ts` and from the package's top-level `packages/shared/src/index.ts`.
  5. Update each storefront source file to a thin re-export wrapping the shared component with its routing/session adornments.
  6. **Tailwind content globbing:** verify both apps' `tailwind.config.*` include `../../packages/shared/src/**/*.{ts,tsx}` (per Phase 3 perf checkpoint). Without this, the shared components render unstyled.
- **Done when:**
  - `npm run typecheck` passes.
  - Storefront category page, PDP, filter sidebar, home, offer banner all render identically to before (visual diff against the PF.4 baseline screenshots).
  - `import { ProductCard, BrandChip, GradeBadge, ... } from "@store/shared"` works from admin without dragging in `next/link` or `next/navigation`.
  - All 19 component files in the list above exist and export from the barrel.
- **PLAN ref:** §1 ("Live previews everywhere"), §9 → Live preview matrix, Appendix B § Shared storefront visuals.
- **Resume note:** —

### T3.1.5 `<PreviewMatrix>` shell + `liveContextLoader` + structural-frame fallbacks

- **Goal:** Three foundations every preview wrapper depends on. **`<PreviewMatrix>`** is the visual shell every editor mounts — a titled card with a vertically-stacked list of labelled preview tiles. **`liveContextLoader.ts`** is a server-only RSC module that pulls REAL existing entities from the database to seed neighbor slots in the tiles (no hardcoded sample data — ever). **`structuralFrames.tsx`** is the cold-start fallback that renders storefront layout shells with low-opacity placeholder text when the loader returns empty.
- **Files:**
  - `apps/admin/src/components/previews/PreviewMatrix.tsx`
  - `apps/admin/src/components/previews/PreviewTile.tsx`
  - `apps/admin/src/lib/previews/liveContextLoader.ts` (server-only)
  - `packages/shared/src/storefrontVisuals/structuralFrames.tsx`
- **Steps:**
  1. **`PreviewMatrix.tsx`** — accepts `{ title: string; tiles: PreviewTileSpec[] }` and renders a sticky-positioned card on the right side of the editor (or below on mobile). Title bar with a small "Preview" label + a help icon (`?`) explaining "These are live previews of how this entity appears on the storefront, using real existing data for context". Below: vertically-stacked tiles.
  2. **`PreviewTile.tsx`** — accepts `{ surfaceLabel: string; dimensionNote?: string; children: ReactNode }`. Renders a small caption ("Appears on: PDP spec strip"), the child component in a bordered frame styled to match the storefront's background color, and (optionally) a tiny footer like "~80×40 px on mobile" or "Renders at 240px wide".
  3. **`liveContextLoader.ts`** — server-only module exporting one loader per entity type:
     - `loadBrandNeighborContext({ brandSlug?, categorySlugs?[] })` → `{ neighborProduct: Product | null; neighborProductsInSidebar: Brand[]; categoryForBreadcrumb: Category | null }`. Picks the most-recently-updated real product in any of the brand's linked categories. Pulls the other real brands in those categories to populate the filter-sidebar tile.
     - `loadCategoryNeighborContext({ categorySlug? })` → `{ neighborCategoriesInGrid: Category[] }`. Pulls the most-recent N=3 other categories so the homepage category-grid tile shows the new category sitting among real siblings.
     - `loadGradeNeighborContext({ categorySlug, gradeSlug? })` → `{ neighborProduct: Product | null; otherGradesInSidebar: Grade[] }`.
     - `loadAttributeNeighborContext({ categorySlug, attributeSlug? })` → `{ neighborProduct: Product | null; otherAttributesInSidebar: Attribute[] }`.
     - `loadProductNeighborContext({ categorySlug, productId? })` → `{ neighborProducts: Product[] }` (for the related-rail and search-result tiles).
     - `loadVariantNeighborContext({ productId, variantId? })` → `{ siblingVariants: Variant[] }`.
     - `loadOfferNeighborContext()` → `{ neighborProduct: Product | null }` (for the home banner tile).
     - `loadStoreInfoNeighborContext()` → no neighbors needed; this loader exists for symmetry and just returns `{}`.
     Each loader is wrapped in React `cache()` so a single editor mount fires at most one query per loader (Appendix D § D.2 Phase 3 perf checkpoint).
  4. **`structuralFrames.tsx`** — pure-presentation cold-start fallbacks. Each exports a shell component that renders the storefront layout with low-opacity placeholder text inside neighbor slots ("Your first product will appear here", "Other brands will appear here", "More attributes will appear here"). No fabricated data — just structure. Components: `ProductCardFrame`, `CategoryGridFrame`, `FilterSidebarFrame`, `PdpHeroFrame`, `OfferBannerFrame`, `VariantSelectorFrame`.
  5. **Pass-through pattern:** each editor page's RSC component calls the relevant loader, passes the bundle as a `liveContext` prop to its client `<*Preview>` wrapper. The wrapper renders each tile using `liveContext.X ?? <StructuralFrame.X />` — if real data is present, use it; otherwise use the structural frame.
  6. The matrix accepts a `deferredFormState` prop wired through `useDeferredValue` so 80wpm typing doesn't stall the form (per PLAN.md Appendix D § D.2 Phase 3).
- **Done when:**
  - A throwaway page mounts `<PreviewMatrix title="Test" tiles={[{ surfaceLabel: "test", children: <div>hi</div> }]} />` and renders the labelled card.
  - Calling `loadBrandNeighborContext` from an RSC against a populated DB returns real products and brands; against an empty DB returns `null` for `neighborProduct` and `[]` for `neighborProductsInSidebar`.
  - Each `structuralFrames.tsx` component renders the storefront layout shell with low-opacity placeholder text (no fabricated brand names, no fabricated prices, no fabricated product photos).
  - No file in the entire `apps/admin/` or `packages/shared/` tree exports `SAMPLE_BRAND`, `SAMPLE_PRODUCT`, or any other hardcoded mock entity (`rg "SAMPLE_(BRAND|PRODUCT|CATEGORY|GRADE|ATTRIBUTE|VARIANT|OFFER|STORED_IMAGE)"` returns zero matches).
  - Throwaway page deleted before commit.
- **PLAN ref:** §1 (live previews + real-data context, never hardcoded), §9 → Live preview matrix, Appendix B.
- **Resume note:** —

### T3.2 Admin preview wrappers — multi-tile matrix per entity, driven by live form state + real neighbor data

- **Goal:** Build one `<*Preview>` wrapper per authored entity. **Each wrapper composes a `<PreviewMatrix>` with multiple labelled tiles — one per storefront surface where the entity appears (per PLAN.md §9 → Live preview matrix).** Wrappers accept (a) the **live form state of the entity being authored** (always — this is the only source for the authored entity), and (b) a **`liveContext` bundle of real existing entities** loaded server-side by the editor page (T3.1.5) for neighbor slots. When `liveContext` is empty (cold start), tiles fall back to structural frames — never hardcoded mock data.
- **Files:** `apps/admin/src/components/previews/{CategoryPreview, BrandPreview, GradePreview, AttributePreview, ProductPreview, VariantPreview, OfferPreview, StoreInfoPreview}.tsx`.
- **Steps:** Each component renders a `<PreviewMatrix title="Preview" tiles={[...]} />` with the tiles below. **Pattern for every tile:** the authored entity is rendered from `form` (live as the admin types); neighbors come from `liveContext` or fall back to `<StructuralFrame>`.
  1. **`CategoryPreview.tsx`** — accepts `{ form, liveContext }` where `liveContext: { neighborCategoriesInGrid: Category[] }`. Tiles:
     - "Appears on: Homepage category grid" — `<CategoryCard>` rendered from `form`, sitting inside a grid alongside the real neighboring categories from `liveContext`. Empty DB → `<CategoryGridFrame>` with the new card in position 1 and placeholder slots labelled "More categories will appear here".
     - "Appears on: Category landing page header" — `<CategoryHeader>` from `form`. (No neighbors needed.)
     - "Appears on: Nav menu chip" — `<CategoryNavChip>` from `form`, inside a faked nav strip that includes real other category chips (or placeholder dashes when empty).
  2. **`BrandPreview.tsx`** — accepts `{ form, liveContext }` where `liveContext: { neighborProduct: Product | null; neighborProductsInSidebar: Brand[]; categoryForBreadcrumb: Category | null }`. Tiles:
     - "Appears on: Product card" — a **real `<ProductCard>` loaded from `liveContext.neighborProduct`** with its brand chip swapped for the live form's brand name. Empty DB → `<ProductCardFrame>` with the new chip in the brand-chip slot and placeholder text for hero/name/price.
     - "Appears on: Filter sidebar" — `<BrandFilterRow>` for the live brand, listed alongside `liveContext.neighborProductsInSidebar` real brands. Empty DB → `<FilterSidebarFrame>` showing only the new brand's row above a "More brands will appear here" placeholder.
     - "Appears on: PDP breadcrumb" — live `<BrandChip>` pill above `liveContext.categoryForBreadcrumb.label` + the real neighbor product's name. Empty DB → frame with placeholder text "Sample product name".
  3. **`GradePreview.tsx`** — accepts `{ form, liveContext }` where `liveContext: { neighborProduct: Product | null; otherGradesInSidebar: Grade[] }`. Tiles:
     - "Appears on: Product card hero" — real `<ProductCard>` from `liveContext.neighborProduct` with `<GradeBadge>` overlaid using the live form's color + label. Empty DB → `<ProductCardFrame>` with the badge corner over a placeholder hero block.
     - "Appears on: PDP grade showcase" — full `<GradeCard>` driven entirely from `form` (notes + color + video). (No neighbors needed.)
     - "Appears on: Filter sidebar" — `<GradeFilterPill>` for the live grade alongside `liveContext.otherGradesInSidebar`. Empty DB → frame.
     - "Appears on: Variant chip dimming" — `<VariantChip>` in/out-of-stock, both rendered using the live form's grade color. (No neighbors needed.)
  4. **`AttributePreview.tsx`** — accepts `{ form, liveContext }` where `liveContext: { neighborProduct: Product | null; otherAttributesInSidebar: Attribute[] }`. Tiles (some only render when `cardPosition` matches):
     - "Appears on: PDP spec strip" — `<AttributeChip>` row driven from `form.options`. (No neighbors needed.)
     - "Appears on: Product card (image overlay)" — only when `cardPosition === "image-overlay"`. Real `<ProductCard>` from `liveContext.neighborProduct` with the live attribute's first option chipped over its hero. Empty DB → frame with the chip over a placeholder hero block.
     - "Appears on: Product card (title chip)" — only when `cardPosition === "title-chips"`. Real `<ProductCard>` with the chip beside its name. Empty DB → frame.
     - "Appears on: Filter sidebar" — `<AttributeFilterGroup>` for the live attribute alongside `liveContext.otherAttributesInSidebar` real attribute groups. Empty DB → frame.
     - "Appears on: Variant selector chips" — faked variant chips using the live attribute's options. (No neighbors needed.)
  5. **`ProductPreview.tsx`** — accepts `{ form, liveContext }` where `liveContext: { neighborProducts: Product[] }`. Tiles:
     - "Appears on: Category listing" — `<ProductCard>` driven entirely from `form`, sitting in a faked grid alongside `liveContext.neighborProducts`. Empty DB → `<CategoryGridFrame>` with the new card in position 1 and placeholders elsewhere.
     - "Appears on: PDP hero" — `<PdpHero>` from `form` (gallery + variant selector + price + grade card + dynamic specs). (No neighbors needed — this surface IS the product.)
     - "Appears on: Related rail" — `<ProductCard>` from `form` at the related-rail size, alongside `liveContext.neighborProducts` cards. Empty DB → frame.
     - "Appears on: Search result" — `<SearchResultRow>` from `form`. (No neighbors needed.)
  6. **`VariantPreview.tsx`** — accepts `{ form, productContext, liveContext }` where `liveContext: { siblingVariants: Variant[] }`. Tiles:
     - "Appears on: PDP variant selector" — `<VariantChip>` for the live variant rendered in-stock + out-of-stock, sitting in a chip strip alongside `liveContext.siblingVariants` chips. New product (no siblings yet) → frame showing only the new chip and a "More variants will appear here" placeholder.
     - "Appears on: Variant gallery strip" — strip of the live variant's `StoredImage.variants.thumb`. (No neighbors needed.)
     - "Appears on: Lightbox zoom" — live variant's first image at `StoredImage.variants.full`. (No neighbors needed.)
  7. **`OfferPreview.tsx`** — accepts `{ form, liveContext }` where `liveContext: { neighborProduct: Product | null }`. Tiles:
     - "Appears on: Home promo banner" — `<OfferBanner>` driven from `form`. (No neighbors needed.)
     - "Appears on: Product card offer chip" — real `<ProductCard>` from `liveContext.neighborProduct` with `<OfferChip>` overlay using the live offer's color + label. Empty DB → `<ProductCardFrame>` with the chip overlay.
  8. **`StoreInfoPreview.tsx`** — accepts `{ form }` (no neighbors needed — this is global chrome). Tiles:
     - "Appears on: Storefront header" — `<StorefrontHeaderPreview>` from `form`.
     - "Appears on: Storefront footer" — `<StorefrontFooterPreview>` from `form`.
  9. Every preview wrapper accepts the form via `useDeferredValue` (100ms debounce — Appendix D § D.2 Phase 3). Neighbor data from `liveContext` is server-loaded once per editor mount and doesn't re-render on form changes.
- **Done when:**
  - Each preview wrapper renders correctly with live form state.
  - Each tile has a non-empty `surfaceLabel` caption ("Appears on: ...") visible in the rendered output.
  - On a populated database, neighbor slots show REAL recently-edited products/brands/categories (not hardcoded names).
  - On an empty database, every neighbor slot falls back to a `<StructuralFrame>` placeholder — no fabricated brand names, prices, or images appear anywhere.
  - The entity being authored (form state) renders in EVERY tile from the live form, with zero hardcoded mock fields.
  - Profile typing rapidly into a sample form: preview re-render rate ≤ 12 commits/sec (Appendix D § D.2 Phase 3 perf checkpoint).
- **PLAN ref:** §1 ("Live previews everywhere" + real-data context), §9 → Live preview matrix, Appendix B § Admin live-preview wrappers.
- **Resume note:** —

### T3.3 `/categories` page shell + grid

- **Goal:** Replace the temporarily-stubbed `/categories` route with the real grid.
- **Files:** `apps/admin/src/app/categories/page.tsx`, `apps/admin/src/components/categories/CategoriesGrid.tsx`.
- **Steps:**
  1. `page.tsx` — server component, requires admin session, loads `Category.find({}).lean()` plus a per-category count of products (Phase 4+ will populate; for now all counts are 0).
  2. `CategoriesGrid.tsx` — client component. Renders a responsive grid of `<CategoryCard>` (the new admin one, T3.4) with a leading `+ Add category` card that opens the `CategoryEditor` drawer in create mode.
  3. Empty-state when there are zero categories: a single large "Create your first category" CTA in the centre of the grid.
- **Done when:** `/categories` loads, shows empty state immediately after Phase 1 wipe, and the `+ Add category` button opens an empty drawer (drawer content built in T3.4).
- **PLAN ref:** §3 (Flow A).
- **Resume note:** —

### T3.4 CategoryCard + CategoryEditor drawer with live preview

- **Goal:** Each category renders as a self-contained card with header (icon, label, description, status, edit) and three nested blocks (Brands, Grades, Attributes). The header's edit-pencil opens `CategoryEditor`.
- **Files:** `apps/admin/src/components/categories/CategoryCard.tsx`, `apps/admin/src/components/categories/CategoryEditor.tsx`.
- **Steps:**
  1. `CategoryCard.tsx` — renders header + three placeholder blocks (BrandsBlock, GradesBlock, AttributesBlock — wired in T3.5–T3.7). Header has edit + archive + overflow menu (sortOrder up/down, delete).
  2. `CategoryEditor.tsx` — drawer with split layout. Left ~60%: form (label, description, icon picker — emoji or Vercel Blob image upload, sortOrder hidden behind "advanced", isActive toggle). Right ~40%: **always-visible `<CategoryPreview>` matrix** (T3.2 — 3 tiles: grid card, landing-page header, nav-menu chip) driven by `useDeferredValue(form)`. Slug is auto-generated read-only. **Never collapsed, never behind a toggle.**
  3. Save → POST `/api/categories` (create) or PUT `/api/categories/<id>` (update).
- **Done when:** can create a category from the empty state and see it appear as a card; editing the label updates the preview live as I type.
- **PLAN ref:** §3.
- **Resume note:** —

### T3.5 Brands block: chip list with inline popover + BrandPreview

- **Goal:** Inside each category card, the Brands block is a chip list. Each chip has hover-edit and hover-delete. A trailing `+` chip opens a small popover that also includes the live `<BrandPreview>`.
- **Files:** `apps/admin/src/components/categories/BrandsBlock.tsx`, `apps/admin/src/components/categories/BrandChip.tsx`, `apps/admin/src/components/categories/BrandEditorPopover.tsx`.
- **Steps:**
  1. `BrandsBlock.tsx` — loads `Brand.find({ categorySlug })` server-side via the category card's parent; renders chips.
  2. `BrandChip.tsx` — chip element with hover pencil/x; clicking either opens `BrandEditorPopover`.
  3. `BrandEditorPopover.tsx` — small popover (not a full drawer, since brands are single-field). Form on left (name + isActive). **Always-visible `<BrandPreview>` matrix** (T3.2 — 3 tiles: chip on ProductCard, filter sidebar row, PDP breadcrumb pill) on right. Save → POST/PUT `/api/brands`.
- **Done when:** can add a brand to a category, see the chip appear instantly, hover-edit renames it, hover-x deletes it after a confirm.
- **PLAN ref:** §3.
- **Resume note:** —

### T3.6 Grades block: GradeEditor drawer with full PDP preview

- **Goal:** Compact grade rows inside the card; row click opens `GradeEditor` drawer with the full PDP-style preview on the right.
- **Files:** `apps/admin/src/components/categories/GradesBlock.tsx`, `apps/admin/src/components/categories/GradeRow.tsx`, `apps/admin/src/components/categories/GradeEditor.tsx`, `apps/admin/src/components/categories/GradePdpPreview.tsx`.
- **Steps:**
  1. `GradesBlock.tsx` — loads `Grade.find({ categorySlug })`. Renders compact two-line rows (color swatch · label · notes excerpt · row icons) + trailing `+ Add grade`.
  2. `GradeEditor.tsx` — wide drawer. Left form: label, notes (rich textarea or markdown), color (hex picker), video (uses `<VideoUpload>` from Phase 2). Right: **always-visible `<GradePreview>` matrix** (T3.2 — 4 tiles: badge on ProductCard, PDP GradeShowcase card, filter pill, variant-chip dimming demo) driven by `useDeferredValue(form)`.
  3. Save → POST/PUT `/api/grades`. Confirm `video` is required at the API layer (per PLAN §10 + T1.4 caveat).
- **Done when:** can create a grade with a video, see the preview play in the drawer, save and see the new grade row in the card.
- **PLAN ref:** §3, §4 (Flow B).
- **Resume note:** —

### T3.7 Attributes block: AttributeEditor drawer with two-context preview

- **Goal:** Compact attribute rows; row click opens `AttributeEditor` drawer with options table + `<AttributePreview>` showing the attribute in PDP spec strip + filter sidebar.
- **Files:** `apps/admin/src/components/categories/AttributesBlock.tsx`, `apps/admin/src/components/categories/AttributeRow.tsx`, `apps/admin/src/components/categories/AttributeEditor.tsx`.
- **Steps:**
  1. `AttributesBlock.tsx` — loads `Attribute.find({ categorySlug })`. Compact rows (label · option count · cardPosition chip · icons) + trailing `+ Add attribute`.
  2. `AttributeEditor.tsx` — drawer. Left form: label, cardPosition select (`image-overlay | title-chips | none`), isActive toggle, options table (drag-sort, add row, delete row; each row is `{ value, label }`). Right: **always-visible `<AttributePreview>` matrix** (T3.2 — up to 5 tiles: PDP spec strip, ProductCard image-overlay, ProductCard title-chip, filter sidebar group, variant selector chips; some tiles only appear when `cardPosition` matches). Every option you add updates every relevant tile instantly.
  3. Save → POST/PUT `/api/attributes`.
- **Done when:** can create an attribute with options, see them appear in both preview contexts, save and see the attribute row in the card.
- **PLAN ref:** §3.
- **Resume note:** —

### T3.8 Brand–category linking + cross-category brand reuse

- **Goal:** A brand can belong to multiple categories (e.g. Apple is in Phones AND Accessories). The model has `brand.categorySlugs: string[]`. Make sure the UI handles this without duplicating brand records.
- **Files:** `apps/admin/src/components/categories/BrandEditorPopover.tsx`, `apps/admin/src/app/api/brands/route.ts`.
- **Steps:**
  1. When adding a brand chip from inside a category card, the popover checks if a brand with the same normalized name already exists (any category). If yes, it offers "Link existing brand to this category" instead of creating a duplicate.
  2. Linking = `$addToSet: { categorySlugs: <current category> }`.
  3. Unlinking (the chip's "x") = `$pull` from `categorySlugs`. If `categorySlugs.length === 0` after pull, soft-delete the brand (set `isActive = false`).
- **Done when:** can add "Apple" to Phones, then go to Accessories card and link the existing Apple brand without creating a second row in the brands collection.
- **PLAN ref:** §3, §10 (Brand).
- **Resume note:** —

### T3.9 Flow A end-to-end smoke

- **Goal:** Walk through creating a complete category from scratch and confirm every preview tile in the matrix rendered correctly with the right caption.
- **Files:** none.
- **Steps:**
  1. Open `/categories`. Confirm empty state.
  2. Create category "Phones" (label, description, icon). **CategoryPreview matrix shows 3 tiles, all captioned ("Appears on: Homepage category grid", "...landing page header", "...Nav menu chip"), each updating live as I type.** Save.
  3. From the new card, add brand "Apple". **BrandPreview matrix shows 3 tiles ("Appears on: Product card", "...Filter sidebar", "...PDP breadcrumb") with the chip rendering in each context.** Save.
  4. Add another brand "Samsung" similarly.
  5. Add a grade "Like New" with notes, color, and uploaded video. **GradePreview matrix shows 4 tiles ("Appears on: Product card hero", "...PDP grade showcase", "...Filter sidebar", "...Variant chip dimming"); the showcase tile plays the video.**
  6. Add an attribute "Storage" with options 64GB, 128GB, 256GB and `cardPosition: image-overlay`. **AttributePreview matrix shows 4 tiles: PDP spec strip, ProductCard image-overlay, filter sidebar group, variant selector chips.** Change `cardPosition` to `title-chips` → image-overlay tile disappears, title-chips tile appears.
  7. Add a second category "Accessories" and link "Apple" to it (T3.8 behavior).
  8. Reload the page. Confirm everything persisted; reopen each editor and confirm matrices re-render with the saved data.
- **Done when:** all 8 steps complete without console errors; every tile caption is visible and accurate. Any failure files a new task in the appropriate spot above.
- **PLAN ref:** §3, §9 → Live preview matrix.
- **Resume note:** —

### T3.10 Wire `<OfferPreview>` + `<StoreInfoPreview>` into existing editors

- **Goal:** Extend the matrix to two non-catalog surfaces that already exist: the Offers editor and the Settings → Store info section. Both must mount their matrix per PLAN.md §9 → Live preview matrix even though they're not part of Flow A.
- **Files:**
  - Offers: `apps/admin/src/components/Offers.tsx` (or its split editor file post-Phase 0 quick wins).
  - Settings → Store info: `apps/admin/src/components/Settings.tsx` or its store-info sub-component.
- **Steps:**
  1. **OfferPreview wiring** — locate the offer create/edit form. Wrap the existing fields in a two-column layout: form left, `<OfferPreview>` matrix right (or stacked on mobile). 2-tile matrix: home promo banner + product-card offer chip. Driven by `useDeferredValue(form)`. Always visible.
  2. **StoreInfoPreview wiring** — locate the Store info subform inside Settings (store name, tagline, logo, social links). Add an always-visible `<StoreInfoPreview>` matrix beside it. 3 tiles: storefront header, storefront footer, PDP "about" callout.
  3. Both wirings use the same `<PreviewMatrix>` shell from T3.1.5 so tile captions + spacing match the rest of the app.
  4. Both editors call `bustAdminCaches()` on save (existing behavior; verify).
- **Done when:**
  - Editing an offer's discount label updates the home-banner tile and product-card offer-chip tile instantly.
  - Editing the store name in Settings updates the header tile + footer tile instantly.
  - Both matrices' tile captions ("Appears on: ...") are visible.
- **PLAN ref:** §9 → Live preview matrix, §1 (Live previews everywhere).
- **Resume note:** —

**Phase 3 exit criteria:** admin can fully author categories with brands, grades, and attributes; every authoring drawer shows a live storefront-styled preview that updates as the form changes. **Perf checkpoint (PLAN.md Appendix D § D.2 / Phase 3):** (a) BOTH `apps/admin/tailwind.config.*` AND `apps/web/tailwind.config.*` include `../../packages/shared/src/**/*.{ts,tsx}` in `content` — verified by inspecting a rendered preview component and confirming all Tailwind classes resolve. (b) Each preview component receives form state through `useDeferredValue` (or equivalent 100ms debounce) so 80wpm typing doesn't trigger 80 re-renders/sec. Profile by typing rapidly into a description field with React DevTools profiler open; aim for ≤ 12 commits/sec on the preview subtree. (c) Storefront bundle unchanged vs PF.4 baseline (admin-only changes). (d) Every new admin mutation route (Category/Brand/Grade/Attribute create/update/delete) calls `bustAdminCaches()`. Squash-merge `phase-3-categories`.

---

## Phase 4 — Product creation page (`/products/new`)

> All work lives in `apps/admin/src/app/products/new/` and `apps/admin/src/components/products/`. No schema changes. Depends on Phase 3 (uses `<ProductCardPreview>` and `<PdpHeroPreview>` from Phase 3).

### T4.1 New route `products/new/page.tsx`

- **Goal:** Rename route folder from `products/create/` to `products/new/`; replace its page with a server component that mounts the new `CreateProduct` client component.
- **Files:** delete `apps/admin/src/app/products/create/{page,loading}.tsx`. Create `apps/admin/src/app/products/new/page.tsx` and `loading.tsx`.
- **Steps:**
  1. Delete old folder, create new one.
  2. `page.tsx`: server component, requires admin session, loads `categories` (with their brands/grades/attributes counts), passes to `<CreateProduct categories={...} />`.
  3. `loading.tsx`: skeleton matching the form skeleton.
  4. Add a sidebar nav link "New product" → `/products/new` (or surface as a CTA on `/products`).
- **Done when:** navigating to `/products/new` renders the skeleton then the page (currently empty client component is fine).
- **PLAN ref:** §1 ("Create-resource route convention"), §5.
- **Resume note:** —

### T4.2 CreateProduct skeleton + category selection

- **Goal:** Stand up the single-page progressive form. First section: category picker. The rest of the form is hidden until a category is chosen.
- **Files:** `apps/admin/src/components/products/CreateProduct.tsx`, `apps/admin/src/components/products/productFormState.ts`.
- **Steps:**
  1. `productFormState.ts` exports a TypeScript type for the in-progress form and a `createInitial()` helper.
  2. `CreateProduct.tsx`: client component, holds form state in `useState`. Renders a `<select>` or chip list of categories from props. On change, calls `loadCategorySurface(slug)` which fetches `/api/admin/categories/<slug>/surface` (returns brands + grades + attributes for that category).
- **Done when:** selecting a category triggers a fetch and renders a "Brand" section beneath the picker (empty list is fine for now).
- **PLAN ref:** §5 (Flow C).
- **Resume note:** —

### T4.3 Brand step + product name input

- **Goal:** After category selection, show a brand chip list (single-select) and a product name input.
- **Files:** `apps/admin/src/components/products/CreateProduct.tsx`.
- **Steps:**
  1. Render brand chips (from the `surface.brands` array).
  2. Render a "Product name" input below; auto-slugify into a read-only `slug` hint.
  3. Validation: both required to proceed to the variants section.
- **Done when:** picking a brand + entering a name reveals the variants section beneath. Name → slug auto-update.
- **PLAN ref:** §5.
- **Resume note:** —

### T4.4 Variants section — add / remove

- **Goal:** Variant list UI. Empty state has "Add variant" button. Each added variant renders a `<VariantCard>`.
- **Files:** `apps/admin/src/components/products/CreateProduct.tsx`, `apps/admin/src/components/products/VariantCard.tsx`.
- **Steps:**
  1. State holds `variants: VariantDraft[]`.
  2. "Add variant" pushes a new draft. Each card has a "Remove" button.
  3. `VariantCard` is a child component, props: `value: VariantDraft`, `onChange`, `onRemove`, `surface: { grades, attributes }`.
- **Done when:** can add 3 variants, remove one, the UI updates correctly.
- **PLAN ref:** §5.
- **Resume note:** —

### T4.5 VariantCard internals

- **Goal:** Per-variant fields: grade chip (single-select from surface), image gallery (Phase 2 component), attribute chips (per attribute, single- or multi-select from options), price, quantity, warranty.
- **Files:** `apps/admin/src/components/products/VariantCard.tsx`.
- **Steps:**
  1. Grade picker: chip list from `surface.grades`. Single-select. Stores `gradeSlug`.
  2. Images: `<ImageGallery value={variant.images} onChange={updateVariantImages} maxImages={8} />`.
  3. Attributes: for each `attribute` in `surface.attributes`, render a chip group. Single-select (the type field is gone — every attribute is options-only). Stores `variant.attributes[attribute.slug] = selectedValue`.
  4. Price (rupees, integer ≥ 0), quantity (integer ≥ 0), warranty (months, optional ≥ 0).
- **Done when:** every field on a single variant card works; data is reflected in the parent state on every change.
- **PLAN ref:** §5.
- **Resume note:** —

### T4.6 Form validation + submit

- **Goal:** Validate the whole form on submit and POST to the existing `/api/products` endpoint.
- **Files:** `apps/admin/src/components/products/CreateProduct.tsx`, `apps/admin/src/components/products/productFormState.ts`.
- **Steps:**
  1. `productFormState.ts` exports a `validate(form)` that returns `{ ok: true, payload }` or `{ ok: false, errors }`.
  2. Validation rules: category required, brand required, name 2–80 chars, ≥1 variant, each variant has gradeSlug + ≥1 image + price ≥ 0 + quantity ≥ 0 + every attribute filled.
  3. On submit: validate → if ok, POST `/api/products` with payload → on success, redirect to `/products/<id>` (the editor).
- **Done when:** valid form submits and lands on the editor for the new product. Invalid form shows inline errors (not just a toast).
- **PLAN ref:** §5.
- **Resume note:** —

### T4.7 localStorage draft persistence

- **Goal:** Form state survives accidental reloads.
- **Files:** `apps/admin/src/components/products/productFormStorage.ts`, `CreateProduct.tsx`.
- **Steps:**
  1. `productFormStorage.ts` exports `loadDraft()` and `saveDraft(state)` keyed under `admin:productNewDraft`. Debounce save by 500ms.
  2. `CreateProduct.tsx` on mount: if a draft exists, prompt "Resume draft from <X minutes ago>?" — yes loads it, no clears storage.
  3. On successful submit: clear the draft.
- **Done when:** filling half the form, reloading the page, and choosing "Resume" restores every field including variant images.
- **PLAN ref:** §5, Appendix B.
- **Resume note:** —

### T4.8 Live preview pane (Product card + PDP hero)

- **Goal:** Pair the form with a sticky live-preview column showing both `<ProductCardPreview>` (how the product appears in the category grid) and `<PdpHeroPreview>` (how the PDP hero looks for the currently-expanded variant).
- **Files:** `apps/admin/src/components/products/CreateProduct.tsx`, `apps/admin/src/components/products/CreateProductPreviewPane.tsx`.
- **Steps:**
  1. Refactor `CreateProduct.tsx` to a two-column layout: form on the left (`max-w-3xl`), the **always-visible `<ProductPreview>` matrix** (T3.2 — 4 tiles: category listing card, PDP hero, related-rail card, search result row) on the right (sticky, ~380px wide on desktop). On tablet, the matrix collapses into a horizontal scroller of tiles; on mobile, it stacks below the form. **Never behind a "Preview" toggle.**
  2. Wire form state through `useDeferredValue(form)` and pass to `<ProductPreview>`. The matrix internally tracks which variant is currently expanded (driven by a prop from the parent so VariantCard expansion toggles the PDP hero tile's selected variant).
  3. **Variant editing** mounts a small inline `<VariantPreview>` matrix (T3.2 — 3 tiles: PDP variant chip both states, gallery thumb strip, lightbox preview) at the bottom of each expanded `VariantCard`. So as the admin builds out a variant, they see exactly the chip / strip / zoom view the customer will see.
  4. Both matrices update via the deferred state on every keystroke; no full re-render of the form.
- **Done when:**
  - Filling category → brand → name updates the ProductPreview matrix's category listing tile.
  - Uploading a variant image updates the PDP hero tile + the gallery thumb strip tile of the variant matrix.
  - Expanding a different variant card switches the PDP hero's selected variant.
  - Setting quantity to 0 on every variant flips the category listing card to its out-of-stock styling.
  - All 4 ProductPreview tile captions are visible ("Appears on: Category listing", etc.).
- **PLAN ref:** §5 (Live preview alongside the form), §1 (Live previews everywhere), §9 → Live preview matrix.
- **Resume note:** —

**Phase 4 exit criteria:** can create a product end-to-end through `/products/new`, with multiple variants, each with its own grade/images/attributes/price/quantity, and watch the live preview update as you type. Squash-merge `phase-4-create-product`.

---

## Phase 5 — Product editor + variant list refactor

### T5.1 Adapt `/products/[id]/page.tsx` to new shape

- **Goal:** Server component loads the new Product shape; passes to the redesigned `ProductEditor`.
- **Files:** `apps/admin/src/app/products/[id]/page.tsx`, `apps/admin/src/app/products/[id]/loading.tsx`.
- **Steps:**
  1. Load the product + the category surface (brands/grades/attributes) for its category.
  2. Pass both to `<ProductEditor>`.
- **Done when:** route loads without runtime errors against migrated data.
- **PLAN ref:** §6 (Flow D).
- **Resume note:** —

### T5.2 ProductEditor refactor — with always-on `<ProductPreview>` matrix

- **Goal:** Remove every hardcoded variant field reference; consume dynamic attributes; keep edit fields at the product level minimal (name, category-readonly, brand, archived/featured toggles). **Mount the same `<ProductPreview>` matrix used by the create page (T4.8 + T3.2) so admins see live storefront previews while editing too** — symmetry between create and edit per PLAN.md §9 → Live preview matrix.
- **Files:** `apps/admin/src/components/ProductEditor.tsx`.
- **Steps:**
  1. Strip product-level image/gallery/highlight/attribute UI.
  2. Brand picker (chips) stays.
  3. Category is read-only (changing category mid-life would invalidate variants — explicit "Move to another category" action is out of scope).
  4. Archived / Featured toggles stay.
  5. **Layout becomes two-column** (same as CreateProduct): form on the left (`max-w-3xl`), **always-visible `<ProductPreview>` matrix** (4 tiles) on the right. Sticky on desktop, stacks on mobile, never behind a toggle.
  6. Variant editing (via `<VariantEditor>` drawer in T5.4) ALSO mounts an inline `<VariantPreview>` matrix (3 tiles) inside the drawer — admins see the chip/gallery/lightbox previews as they tweak a variant.
- **Done when:**
  - Editing a migrated product's name/brand/flags saves correctly.
  - The ProductPreview matrix is visible at all times the editor is mounted.
  - The VariantPreview matrix appears the moment a VariantEditor drawer opens.
- **PLAN ref:** §6, §1 (Live previews everywhere), §9 → Live preview matrix.
- **Resume note:** —

### T5.3 Variant list in editor

- **Goal:** Show variants as compact rows in the editor with inline summary (grade chip, price, quantity, first image thumb). Each row opens a `<VariantEditor>` drawer.
- **Files:** `apps/admin/src/components/ProductEditor.tsx` (variant list section).
- **Steps:**
  1. Render variants as a vertical list of rows with: thumb (first image, 48×48), grade chip, price (formatted), quantity, "Edit" button.
  2. "Add variant" button at the bottom opens an empty `<VariantEditor>` drawer in create mode.
- **Done when:** the list renders correctly and "Edit" / "Add" both open the drawer.
- **PLAN ref:** §6.
- **Resume note:** —

### T5.4 VariantEditor drawer

- **Goal:** Reusable per-variant editor. Reuses the field components from `<VariantCard>` (T3.5) inside a drawer body. Mounts the inline `<VariantPreview>` matrix so the admin sees live storefront previews of the variant chip / gallery strip / lightbox while editing.
- **Files:** `apps/admin/src/components/products/VariantEditor.tsx`.
- **Steps:**
  1. Drawer with the same fields as `VariantCard`. Save → PUT `/api/products/<id>/variants/<variantId>` (existing route, updated in T1.14).
  2. Delete button on existing variants → DELETE.
  3. Create mode (no `variantId`) → POST `/api/products/<id>/variants`.
  4. **Always-visible `<VariantPreview>` matrix** (T3.2 — 3 tiles: PDP chip both states, gallery thumb strip, lightbox preview) mounted at the bottom of the drawer body (or to the right on wide drawers). Driven by `useDeferredValue(form)`. Never collapsed.
- **Done when:**
  - Can edit and delete variants from the editor. Quantity changes persist.
  - VariantPreview matrix is visible the moment the drawer opens.
  - Toggling quantity from > 0 to 0 visibly flips the variant chip tile from in-stock to out-of-stock styling.
- **PLAN ref:** §6, §9 → Live preview matrix.
- **Resume note:** —

### T5.5 Inline quantity edit on rows

- **Goal:** Quick stock adjustment without opening the drawer.
- **Files:** `apps/admin/src/components/ProductEditor.tsx`.
- **Steps:**
  1. Quantity cell becomes a small inline number input with +/- buttons. Blur or Enter triggers a PATCH `/api/products/<id>/variants/<variantId>` with `{ quantity }`.
  2. Optimistic update; revert on error.
- **Done when:** can change quantity from 5 to 7 without opening the drawer.
- **PLAN ref:** §6.
- **Resume note:** —

**Phase 5 exit criteria:** can fully manage a product's variants from the editor. Squash-merge `phase-5-editor`.

---

## Phase 6 — Storefront PDP alignment

> Bring the storefront in line with the new variant-centric model. PDP is the only page that gets a meaningful redesign; everything else is just consuming the new serializer shape.

### T6.1 Variant-driven gallery — variant-aware surfaces + blur placeholders + lightbox

- **Goal:** PDP gallery reads `selectedVariant.images`, picks the right `StoredImage` variant for each surface (hero = `detail`, strip thumb = `thumb`, lightbox zoom = `full`), ships `placeholder="blur"` with the inline blurhash, and keeps `next/image` doing its CDN-optimization work. See PLAN.md §10 (StoredImage), Appendix D § D.2 (Phase 2 image pipeline) and § D.3 (variant byte ceilings).
- **Files:** `apps/web/src/app/shop/[category]/[slug]/page.tsx`, `apps/web/src/components/shared/ProductImage.tsx` (refactored in T2.5), `apps/web/src/components/shared/ProductCard.tsx`, `apps/web/src/components/shared/PhoneVisual.tsx`, plus a new `apps/web/src/components/shared/PdpGallery.tsx` if extracting the gallery is cleaner than inlining.
- **Steps:**
  1. PDP page picks a default selected variant (first available by quantity > 0, falling back to first).
  2. The PDP **hero image** uses `<ProductImage image={selectedVariant.images[selectedImageIndex]} surface="detail" sizes="(max-width: 768px) 100vw, 50vw" priority />`. Set `priority` only on the very first image rendered (the LCP candidate); other images use `loading="lazy"`.
  3. The **thumbnail strip** uses `<ProductImage image={img} surface="thumb" sizes="80px" />` per thumb.
  4. The **lightbox/zoom modal** (new — wrap the storefront `Lightbox` if reusing from admin, else minimal new component) uses `<ProductImage image={img} surface="full" sizes="100vw" />`. Pinch-zoom on mobile uses native browser behavior; desktop uses a click-to-zoom hover effect.
  5. The **ProductCard** (category page + related rail) uses `<ProductImage image={firstVariant.images[0]} surface="card" sizes="(max-width: 640px) 50vw, 240px" />`.
  6. When the user picks a different variant, gallery re-binds. **Memoization:** wrap `<PdpGallery>` in `React.memo` keyed on `variantId` so unrelated PDP re-renders (e.g. quantity changes) don't trigger gallery work. See Phase 6 perf checkpoint (b).
  7. The thumbnail strip is keyboard-focusable; arrow keys cycle, Enter opens lightbox.
- **Done when:**
  - Switching variants visibly changes the gallery.
  - DevTools Network on a cold load of a real PDP: the hero image fetched is the `card` width's WebP (or `detail` on desktop), not the `full` variant. Total bytes for the above-the-fold image budget ≤ 200 KB on mobile, ≤ 350 KB on desktop.
  - `view-source:` shows `blurDataURL=` inlined into the rendered HTML for the hero image.
  - React DevTools Profiler: switching variants causes exactly 1 re-render of the gallery subtree (no parent cascade).
  - Lightbox opens with the `full` variant; mobile pinch-zoom works.
- **PLAN ref:** §7, §10 (StoredImage variants table), Appendix D § D.2 (Phase 6 risks) + § D.3 (variant byte ceilings).
- **Resume note:** —

### T6.2 DynamicSpecStrip

- **Goal:** Replace hardcoded specs with a dynamic strip driven by `variant.attributes` × `Attribute.cardPosition`.
- **Files:** `apps/web/src/components/shared/DynamicSpecStrip.tsx`, `apps/web/src/lib/storefront/attributeDisplay.ts`.
- **Steps:**
  1. New helper `attributeDisplay.ts` loads category attributes, sorts by `cardPosition` (`primary` / `secondary` / `hidden`), formats values for display.
  2. `DynamicSpecStrip` renders chips/badges for `primary` attributes inline on the PDP, dropdown for `secondary`.
- **Done when:** PDP for a phone shows storage / RAM / battery / PTA / color as dynamic chips.
- **PLAN ref:** §7.
- **Resume note:** —

### T6.3 GradeShowcase consumes new Grade shape

- **Goal:** `GradeShowcase` reads `Grade.notes`, `Grade.color`, `Grade.video`. Drops the hardcoded tone-to-color map.
- **Files:** `apps/web/src/components/shared/GradeShowcase.tsx`.
- **Steps:**
  1. Replace tone-by-slug map (lines 27–58 per Appendix A) with direct `grade.color` reads.
  2. Replace dual notes (`cosmeticNotes` + `functionalNotes`) with single `grade.notes`.
  3. Render `<video>` if `grade.video` is set; fallback to styled placeholder otherwise.
- **Done when:** PDP grade section renders correctly for every grade in the DB. Empty `video` shows placeholder, populated `video` plays.
- **PLAN ref:** §7, §4 (Flow B).
- **Resume note:** —

### T6.4 VariantSelector polish

- **Goal:** Storefront variant picker chips that respect quantity (out-of-stock styling for quantity === 0).
- **Files:** `apps/web/src/components/shared/VariantSelector.tsx`.
- **Steps:**
  1. Each variant chip shows grade label + relevant attributes (color, storage).
  2. `quantity === 0` chips render in muted state, click is disabled (or selects but PDP shows "out of stock").
- **Done when:** out-of-stock variants are visually distinct and uninteractable.
- **PLAN ref:** §7.
- **Resume note:** —

### T6.5 CompareVariants modal

- **Goal:** Update the modal to render new variant shape correctly.
- **Files:** `apps/web/src/components/shared/CompareVariants.tsx`.
- **Steps:**
  1. Table columns: variant, price, quantity, grade chip, key attributes.
  2. Drop legacy phone-only fields.
- **Done when:** modal opens with a clean side-by-side, no broken cells.
- **PLAN ref:** §7.
- **Resume note:** —

### T6.6 ProductCard summary + missing-product filter

- **Goal:** Category-page product cards show variant-derived hero + lowest price; storefront filters out products that no longer exist (in case any IDs lingered in wishlists/carts after the catalog wipe).
- **Files:** `apps/web/src/components/shared/ProductCard.tsx`, `apps/web/src/lib/productSummary.ts`, `apps/web/src/components/wishlist/Wishlist.tsx`, `apps/web/src/components/cart/Cart.tsx`.
- **Steps:**
  1. `productSummary.ts` computes lowest in-stock price and a hero image (first variant's first image) from the new shape.
  2. ProductCard renders summary fields. **Note:** ProductCard now imports from `@store/shared/storefrontVisuals/ProductCard` (extracted in T3.1). Drop the duplicate logic.
  3. Wishlist / cart: after fetching products by ID, filter out null results. Render a small "Some items are no longer available" notice if any IDs were filtered.
- **Done when:** category page lists products with correct hero + lowest in-stock price. Wishlist with stale IDs (from before catalog wipe) renders gracefully.
- **PLAN ref:** §7, §1 (Cold start cleanup).
- **Resume note:** —

**Phase 6 exit criteria:** storefront PDP and category page are usable end-to-end against the freshly-rebuilt catalog. Cart and checkout were not redesigned but still work. **Perf checkpoint (PLAN.md Appendix D § D.2 / Phase 6 + § D.3):** (a) `dynamic = "force-dynamic"` preserved on PDP route (still on the `dynamic = "force-dynamic"` line in `apps/web/src/app/shop/[category]/[slug]/page.tsx`). (b) Variant gallery profiled: switching variants causes ≤ 1 re-render of the gallery subtree (use React DevTools profiler). (c) Grade video: `preload="metadata"`, no `autoPlay`, click-to-play overlay, intersection observer pauses when off-screen — verified manually on mobile profile. (d) Bundle delta vs PF.4 baseline: PDP first-load JS ≤ +5 KB gzip; home unchanged. (e) Lighthouse mobile PDP LCP within +0 ms of baseline (target unchanged). (f) Mongo queries per PDP render unchanged (spec strip reads from `StorefrontReferenceProvider`, no new fetch). Squash-merge `phase-6-storefront`.

---

## Phase 7 — SEO foundations + JSON-LD + sitemap + dynamic OG + admin SEO panel

> Adds the SEO layer end-to-end: schema additions, auto-generation, JSON-LD, sitemap/robots, dynamic OG images, and a Rank Math-style admin panel with live SERP preview and 0-100 checklist score. Designed so admins can ship a fresh product and have it crawl-ready without thinking. See PLAN.md §13.
>
> Hard prerequisites: Phase 1 (Variant.images is already `StoredImage[]` with per-image `alt`; non-product image fields — Category icon, Offer banner, Settings logo/favicon/OG — also already `StoredImage`), Phase 4 (product editor exists), Phase 6 (storefront PDP renders the new shape). Phase 2 (single `/api/uploads` route + `StorageProvider`) is also required for OG image overrides and the SEO settings tab's default-OG upload.
>
> Branch: `phase-7-seo`. Sub-PRs allowed for the panel UI / JSON-LD / sitemap if they get reviewed independently.

### Group A — Schema + shared types

#### T7.1 Add `seo` subdocument to Product, Category, Brand, Offer

- **Goal:** Optional `SeoMeta` subdoc on every entity with a public page. No migration; entities created before Phase 7 ship just get `seo: undefined` and rely on auto-generation.
- **Files:** `packages/shared/src/seo/seoMeta.ts` (new), `packages/db/src/models/Product.ts`, `packages/db/src/models/Category.ts`, `packages/db/src/models/Brand.ts`, `packages/db/src/models/Offer.ts`, `packages/shared/src/index.ts`.
- **Steps:**
  1. Create `seoMeta.ts` in `packages/shared/src/seo/` exporting:
     ```ts
     export interface SeoMeta {
       title?: string;
       description?: string;
       canonicalUrl?: string;
       ogImageUrl?: string;
       focusKeyword?: string;
       noindex?: boolean;
       nofollow?: boolean;
     }
     ```
  2. Re-export from `packages/shared/src/index.ts` (the barrel).
  3. In each affected model, define a Mongoose `seoSchema = new Schema<SeoMeta>({ title: String, description: String, canonicalUrl: String, ogImageUrl: String, focusKeyword: String, noindex: Boolean, nofollow: Boolean }, { _id: false })` and add `seo: { type: seoSchema, default: () => ({}) }` to the main schema. The whole subdoc remains optional (all fields optional, default empty object so reads don't blow up).
  4. Update the TypeScript interfaces (`ProductAttributes`, `CategoryAttributes`, `BrandAttributes`, `OfferAttributes`) to include `seo?: SeoMeta`.
- **Done when:** `npm run typecheck -w @store/db` passes. Reading a pre-existing Product still works (`product.seo` is `{}`). Saving a new Product with `seo: { focusKeyword: "iphone 14 pro" }` round-trips through Mongoose correctly.
- **PLAN ref:** §10 (SeoMeta), §13.2.
- **Resume note:** —

#### T7.2 Add `seo.*` keys to global Settings + Settings bootstrap

- **Goal:** Global SEO defaults live in the existing `Setting` collection. The bootstrap sets sensible defaults so admins aren't staring at blank fields.
- **Files:** `packages/db/src/bootstrap.ts`, `packages/db/src/models/Setting.ts` (if a typed-keys list exists), `apps/admin/src/lib/api/fieldLimits.ts` (or wherever settings keys are typed).
- **Steps:**
  1. In `bootstrap.ts`, after the chat keys, add the **Store info** + **SEO** keys with defaults per PLAN.md §13.2 (two groups; `store.logo` / `store.favicon` / `seo.ogImageDefault` are seeded as `null` until the admin uploads — `<ImageUpload>` writes the full `StoredImage` object on save):

     **Store info group:**
     - `store.name = "Ibrahim Mobiles"`
     - `store.tagline = ""`
     - `store.logo = null` (typed `StoredImage | null` — populated via `<ImageUpload>` in T3.10 Settings → Store info)
     - `store.favicon = null` (typed `StoredImage | null`)

     **SEO group:**
     - `seo.storeName = ""` (blank = inherits `store.name` in title templates)
     - `seo.titleTemplate = "{title} | {storeName}"`
     - `seo.defaultDescription = "Refurbished phones and accessories in Pakistan — graded and warranted."`
     - `seo.ogImageDefault = null` (typed `StoredImage | null` — populated via `<ImageUpload>` in T7.12 SEO settings tab)
     - `seo.organization.legalName = ""`
     - `seo.organization.contactPhone = ""`
     - `seo.organization.contactEmail = ""`
     - `seo.organization.address = { street: "", city: "", region: "", postalCode: "", country: "PK" }` (single key stored as JSON-serialized object)
     - `seo.organization.sameAs = []` (JSON array)
     - `seo.googleSiteVerification = ""`
     - `seo.robotsDisallow = ["/admin", "/account", "/checkout", "/cart"]` (JSON array)

     **Intentionally NOT seeded** (would duplicate `store.logo`): `seo.organization.logoUrl`. Organization JSON-LD derives `logo` from `store.logo.variants.detail` inside `composeSeoMeta` (T7.3).
  2. If any settings-validation map exists (e.g. a Zod schema or a typed key list), extend it with the new keys. Mark `store.logo`, `store.favicon`, `seo.ogImageDefault` as `StoredImage | null` so the validator accepts the structured object shape.
  3. Settings bootstrap is idempotent — only seed if the key doesn't exist.
- **Done when:** running the admin against an empty DB seeds the new keys; running again does not duplicate them; the existing Settings page (which lists raw key/value pairs) shows them.
- **PLAN ref:** §13.2.
- **Resume note:** —

### Group B — Auto-generation + JSON-LD

#### T7.3 composeSeoMeta — the pure auto-generation function

- **Goal:** A single deterministic function maps `(entity, settings)` → `ResolvedSeoMeta`. Same function used by storefront render AND admin SERP preview so what you see in preview is what the customer gets.
- **Files:** `apps/web/src/lib/seo/composeSeoMeta.ts` (new), `apps/web/src/lib/seo/titleTemplate.ts` (new).
- **Steps:**
  1. `titleTemplate.ts` exports `applyTitleTemplate(template: string, vars: Record<string, string>): string` — interpolates `{title}`, `{storeName}`, etc.; preserves unmatched placeholders as-is.
  2. `composeSeoMeta.ts` exports:
     ```ts
     export interface ResolvedSeoMeta {
       title: string;
       description: string;
       canonical: string;
       ogImageUrl: string;
       twitterCard: "summary" | "summary_large_image";
       robots: string; // "index,follow" | "noindex,follow" etc.
     }
     export function composeProductSeo(product, brand, category, settings): ResolvedSeoMeta { ... }
     export function composeCategorySeo(category, settings): ResolvedSeoMeta { ... }
     export function composeBrandSeo(brand, settings): ResolvedSeoMeta { ... }
     export function composeOfferSeo(offer, settings): ResolvedSeoMeta { ... }
     export function composeHomeSeo(settings): ResolvedSeoMeta { ... }
     ```
  3. Implement the rules from PLAN.md §13.3 exactly (title, description, canonical, ogImage). When `entity.seo.X` is set, use it; else compute from entity data + settings.
  4. Always produce a valid string for every field; never return undefined. Truncate description to 160 chars (preserve word boundary).
  5. Robots string: combine `noindex` and `nofollow` booleans into `"noindex,nofollow"` / `"noindex,follow"` / `"index,nofollow"` / `"index,follow"`.
- **Done when:** pure-function unit tests (write inline in a `.test.ts` if vitest is set up; else a throwaway script) cover: (a) auto generation when entity.seo is empty, (b) manual override wins, (c) title template applied correctly.
- **PLAN ref:** §13.3.
- **Resume note:** —

#### T7.4 JSON-LD generators

- **Goal:** Schema.org structured data for every page type. Validates clean against Google's Rich Results test.
- **Files:** `apps/web/src/lib/seo/jsonLd.ts` (new).
- **Steps:**
  1. Implement (per PLAN.md §13.4): `productJsonLd(product, variant, brand, category, settings)` → returns `@type: Product` with nested `Offer` (priceCurrency: "PKR", price, availability: "https://schema.org/InStock" or OutOfStock, itemCondition: maps from `grade.label` to one of `NewCondition` / `UsedCondition` / `RefurbishedCondition` — defaults to `RefurbishedCondition`), `Brand` (name from brand doc), `aggregateRating` only if present (we don't have reviews yet, so omit).
  2. `breadcrumbJsonLd(crumbs: { name: string; url: string }[])` → `BreadcrumbList`.
  3. `collectionPageJsonLd(category, products, settings)` → `CollectionPage` with `ItemList` of first 24 products.
  4. `organizationJsonLd(settings)` → `Organization` (or `LocalBusiness` when `seo.organization.address.street` is non-empty) — fills name, legalName, url, logo, contactPoint, sameAs, address.
  5. `websiteJsonLd(settings)` → `WebSite` with `potentialAction: SearchAction` pointing at `<siteUrl>/search?q={search_term_string}`.
  6. Each function returns a plain JS object. Callers wrap in `<script type="application/ld+json">{JSON.stringify(obj)}</script>`. Provide one small helper `jsonLdScript(obj)` that returns the React node.
- **Done when:** generated objects pass `JSON.stringify` cleanly; manual smoke against Google Rich Results test (T7.13) passes for at least one product.
- **PLAN ref:** §13.4.
- **Resume note:** —

### Group C — Storefront wiring

#### T7.5 Wire Next.js Metadata API on every public route

- **Goal:** Every storefront page sets `<title>`, `<meta description>`, OG/Twitter, canonical, robots via `generateMetadata`.
- **Files:** `apps/web/src/app/layout.tsx` (root metadata + default OG fallback), `apps/web/src/app/page.tsx` (home), `apps/web/src/app/shop/[category]/page.tsx`, `apps/web/src/app/shop/[category]/[slug]/page.tsx`, `apps/web/src/app/deals/page.tsx`, `apps/web/src/app/sell/page.tsx` (if exists), `apps/web/src/app/about/page.tsx` (if exists).
- **Steps:**
  1. Root layout exports `metadata: Metadata` with `metadataBase: new URL(siteUrl)`, default `title`, default `openGraph`, `twitter`, `verification.google` (from settings).
  2. Each dynamic route exports `async function generateMetadata({ params })` that fetches the entity + settings, calls the appropriate `composeXxxSeo(...)`, and returns a `Metadata` object.
  3. Include JSON-LD in the page itself (not in metadata): render `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(...)) }} />` at the top of the page component. Add `breadcrumbJsonLd` to PDP and category. Add `organizationJsonLd` + `websiteJsonLd` to home.
- **Done when:** `curl https://<siteUrl>/shop/phones/<a-real-product-slug> | grep -E '<title>|og:|application/ld\+json'` returns the expected tags and JSON-LD blob.
- **PLAN ref:** §13.3, §13.4.
- **Resume note:** —

#### T7.6 sitemap.ts — DB-driven, cached

- **Goal:** Finish the existing partial sitemap; ship a complete dynamic sitemap.
- **Files:** `apps/web/src/app/sitemap.ts`.
- **Steps:**
  1. Default export `async function sitemap(): Promise<MetadataRoute.Sitemap>`.
  2. Include static URLs: `/`, `/shop`, `/sell`, `/deals`, `/about`, `/contact`, `/account/sign-in` (priority 1.0 for home; 0.8 for shop / deals; 0.5 for sell/about/contact; 0.3 for account/sign-in).
  3. Append every active Category: `{ url: \`${siteUrl}/shop/\${slug}\`, lastModified: updatedAt, changeFrequency: "daily", priority: 0.8 }`.
  4. Append every active, non-archived Product: `{ url: \`${siteUrl}/shop/\${category}/\${slug}\`, lastModified, changeFrequency: "daily", priority: 0.7 }`.
  5. Append every active Offer with a landing page (if any).
  6. Add `export const revalidate = 3600;` so the response is cached for 1 hour.
- **Done when:** `curl https://<siteUrl>/sitemap.xml` returns valid XML with all the above URLs; second curl is cached (response time < 50ms).
- **PLAN ref:** §13.5.
- **Resume note:** —

#### T7.7 robots.ts

- **Goal:** Settings-driven `/robots.txt`.
- **Files:** `apps/web/src/app/robots.ts`.
- **Steps:**
  1. Default export `async function robots(): Promise<MetadataRoute.Robots>`.
  2. Reads `seo.robotsDisallow` from Settings; builds `{ rules: [{ userAgent: "*", allow: "/", disallow: [...settings] }], sitemap: \`${siteUrl}/sitemap.xml\`, host: siteUrl }`.
  3. `export const revalidate = 3600;`.
- **Done when:** `curl https://<siteUrl>/robots.txt` returns the expected text with `Sitemap:` line.
- **PLAN ref:** §13.5.
- **Resume note:** —

#### T7.8 Dynamic OG image generation — reads `variants.detail`, redirects to `variants.full` on failure

- **Goal:** Branded social-share cards rendered server-side. Uses the pre-generated `variants.detail` (1080w) as the embedded photo — right size for the 1200×630 OG canvas, doesn't pull the `full` variant unnecessarily. Falls back to the variant hero (`variants.full`) via 302 on render failure. See PLAN.md §10 (StoredImage variant table), §13.6, Appendix D § D.3 (image budgets).
- **Files:** `apps/web/src/app/shop/[category]/[slug]/opengraph-image.tsx` (new), `apps/web/src/app/shop/[category]/opengraph-image.tsx` (new), `apps/web/src/app/opengraph-image.tsx` (new, home).
- **Steps:**
  1. Each file uses `next/og`'s `ImageResponse`. Size: 1200×630. Add `export const revalidate = 86400` and `export const contentType = "image/png"`.
  2. PDP card layout: background tinted by `grade.color` (semi-transparent gradient over a neutral base), product hero photo on the right at 40% width with rounded corner + subtle shadow. **Photo source: `selectedVariant.images[0].variants.detail`** — fetched by `next/og` server-side, downscaled into the 1200×630 canvas. (Not `full` — that'd waste bytes; not `card` — it'd upscale and look soft.)
  3. Left column stacked: brand chip (small pill), product name (3xl, bold), grade label + warranty (md, muted), price (2xl, bold, accent color), `Free delivery in Pakistan` (sm). Bottom: storefront logo + URL.
  4. Use system fonts (Next.js inlines them) or fetch Inter subset inside the route (`new URL("./Inter-Bold.woff", import.meta.url)`).
  5. **Failure fallback:** wrap the `new ImageResponse(...)` in `try/catch`. On error, log + return `Response.redirect(image.variants.full, 302)` — the social bot gets the raw hero photo, still better than a broken card.
  6. Category card variant: simpler — category label + a tiled montage of up to 4 `variants.detail` from featured products.
  7. Home card variant: simpler still — `store.name` + `store.tagline` + `store.logo` (`variants.detail`). No product photo (falls back to `seo.ogImageDefault.variants.detail` if `store.logo` isn't set).
- **Done when:**
  - `curl https://<siteUrl>/shop/phones/<product-slug>/opengraph-image` returns a PNG ~150–300 KB that visually matches the design.
  - The OG route's input fetch is for `variants.detail` (verified via server logs or DevTools Network on a force-reload).
  - Killing the OG render (e.g. by passing a bogus grade color) yields a 302 to `variants.full`, NOT a 500.
  - Cold render < 600 ms; warm (CDN cache) < 50 ms.
  - Pasting the page URL into a Twitter/X compose box shows the card.
- **PLAN ref:** §13.6, §10 (StoredImage), Appendix D § D.2 (Phase 7 risks) + § D.3.
- **Resume note:** —

### Group D — Admin SEO panel

#### T7.9 SeoPanel component (the Rank Math-style panel)

- **Goal:** The collapsible "SEO" section mounted at the bottom of every entity editor.
- **Files:** `apps/admin/src/components/seo/SeoPanel.tsx` (new), `apps/admin/src/components/seo/CharacterCounter.tsx` (new).
- **Steps:**
  1. Props:
     ```ts
     interface SeoPanelProps {
       value: SeoMeta;
       onChange: (next: SeoMeta) => void;
       // For computing the auto-meta + checklist
       entityType: "product" | "category" | "brand" | "offer";
       entity: ProductLike | CategoryLike | BrandLike | OfferLike;
       settings: SeoSettings;
       siteUrl: string;
     }
     ```
  2. Layout matches the wireframe in PLAN.md §13.7: collapsible header with score badge, focus keyword input, title + description textareas with `<CharacterCounter />` adornments (targets 30-60 for title, 120-160 for description; below/above range = yellow, way off = red), canonical URL input, OG image override using the existing `ImageGallery` (single-image mode), noindex/nofollow checkboxes.
  3. Below the form: render `<SerpPreview />` (T7.10) and `<SeoChecklistView />` (T7.11), both driven by `composeXxxSeo(form, settings)` resolved meta.
  4. The header score badge: pulls from the checklist's computed 0-100 score. Green ≥70, yellow ≥50, red below.
- **Done when:** mounting `<SeoPanel>` on a throwaway test page lets you edit fields and see the score change in real time.
- **PLAN ref:** §13.7.
- **Resume note:** —

#### T7.10 SerpPreview component

- **Goal:** A live Google-search-style preview card driven by the resolved meta.
- **Files:** `apps/admin/src/components/seo/SerpPreview.tsx` (new).
- **Steps:**
  1. Props: `{ resolved: ResolvedSeoMeta; siteUrl: string }`.
  2. Layout matches Google's current desktop SERP card: small site favicon + URL breadcrumb (e.g. `ibrahimmobiles.com › shop › phones › iphone-14-pro`), then title in Google's blue color (truncated at ~60 chars with ellipsis), then description in dark gray (truncated at ~160 chars with ellipsis).
  3. Use the same font as Google (Arial-ish — system stack is fine for a preview).
- **Done when:** the card visually matches a real Google search result on a side-by-side check.
- **PLAN ref:** §13.7.
- **Resume note:** —

#### T7.11 SeoChecklistView + score calculator

- **Goal:** The pass/warn/fail panel + 0-100 score.
- **Files:** `apps/admin/src/components/seo/SeoChecklistView.tsx` (new), `apps/web/src/lib/seo/seoChecklist.ts` (new, but importable from admin via a barrel — or duplicate the function in `apps/admin/src/lib/seo/`; doesn't have to be shared since it runs only on admin form state + entity data).
- **Steps:**
  1. Pure function `evaluateSeoChecklist(resolved, entity, focusKeyword): SeoChecklistResult` where `SeoChecklistResult = { items: { id: string; label: string; status: "pass" | "warn" | "fail" }[]; score: number }`.
  2. Eight items (configurable per entity type — products get all 8, categories get 6, etc.):
     - Title length in 30-60 (pass) / 20-79 (warn) / else fail.
     - Description length in 120-160 / 80-200 / else.
     - Focus keyword present in title (case-insensitive substring).
     - Focus keyword present in description.
     - Focus keyword present in URL slug.
     - Hero image present (product/category only).
     - All variant images have non-empty alt text (product only).
     - JSON-LD generated without throwing (always pass unless the generator errors).
  3. Score = `Math.round((passCount + warnCount * 0.5) / itemCount * 100)`.
  4. View component renders each item with an icon (✓ / ⚠ / ✗), color-coded.
  5. If focus keyword is empty, the three "focus keyword" checks render as gray "n/a" and are excluded from the denominator.
- **Done when:** writing a low-quality test entity (no focus keyword, 200-char description, no images) produces a red panel scoring < 30; a well-filled-out entity scores > 80.
- **PLAN ref:** §13.7.
- **Resume note:** —

#### T7.12 Wire SeoPanel into product / category / brand / offer editors + global SEO settings tab

- **Goal:** Every editor that authors a public entity now has an SEO section. The Settings page gets a new "SEO" tab for global defaults.
- **Files:**
  - Product editor: `apps/admin/src/components/ProductEditor.tsx` or wherever it lives post-Phase 5; also the create page `apps/admin/src/components/products/CreateProduct.tsx`.
  - Category drawer: `apps/admin/src/components/categories/CategoryEditor.tsx`.
  - Brand drawer: `apps/admin/src/components/categories/BrandEditor.tsx`.
  - Offer editor: `apps/admin/src/components/Offers.tsx` (or its editor file).
  - New file: `apps/admin/src/components/settings/SeoSettings.tsx`.
  - Settings page: `apps/admin/src/app/settings/page.tsx` (add the SEO tab).
- **Steps:**
  1. Each editor's form state gains a `seo` field. On save, include `seo` in the PATCH/POST body; the API serializers (touched in T7.1) round-trip it.
  2. Mount `<SeoPanel value={form.seo ?? {}} onChange={(seo) => setForm({ ...form, seo })} entityType="..." entity={form} settings={seoSettings} siteUrl={...} />` at the bottom of each editor, collapsed by default.
  3. Global SEO settings tab: mirrors the `seo.*` keys. Includes store name (with live "what your title will look like" preview), title template, default description, default OG image upload, Organization fields (legalName, logo upload, contact phone/email, postal address fields), social profile URLs as a chip-list editor, Google Search Console verification token, robots disallow list editor.
  4. Each save POSTs to the existing settings PATCH endpoint with `seo.X` keys.
- **Done when:**
  - Creating a new product with a custom SEO title saves and reloads correctly; the public PDP shows that custom title.
  - Updating `seo.storeName` in the Settings page changes the title across all public pages on next render.
- **PLAN ref:** §13.7, §13.8.
- **Resume note:** —

### Group E — Smoke

#### T7.13 End-to-end SEO smoke + Google Rich Results check

- **Goal:** Validate that everything works against real validators before declaring Phase 7 done.
- **Files:** none (this is a verification task).
- **Steps:**
  1. Pick a real product PDP URL on prod (or a preview deploy). Submit to [Google Rich Results Test](https://search.google.com/test/rich-results). Expect "Product snippets" detected with no errors.
  2. Submit the home page URL to the same tool. Expect "Organization" + "WebSite" detected.
  3. View source on a PDP: confirm `<title>`, `<meta name="description">`, `<meta property="og:*">`, `<meta name="twitter:*">`, `<link rel="canonical">`, `<meta name="robots">`, and JSON-LD `<script>` are all present and non-empty.
  4. Open [Twitter/X Card Validator](https://cards-dev.twitter.com/validator) (if still available) or simulate by pasting the PDP URL into a draft tweet — card should render with the dynamic OG image.
  5. `curl https://<siteUrl>/sitemap.xml` and `https://<siteUrl>/robots.txt` — both valid.
  6. Submit sitemap to Google Search Console (manual step). Confirm it's accepted within 24h.
- **Done when:** Google Rich Results test passes for at least one product + the home page; sitemap + robots return clean.
- **PLAN ref:** §13.
- **Resume note:** This is the only manual smoke task. Tag the prod commit `v1.0.0-seo` once green.

**Phase 7 exit criteria:** every public page ships meta tags + JSON-LD; sitemap + robots auto-generated; dynamic OG cards render; every entity editor has a working SEO panel with live SERP preview + score; global SEO settings tab functional. **Perf checkpoint (PLAN.md Appendix D § D.2 / Phase 7 + § D.3):** (a) Every `composeXxxSeo` function in `apps/web/src/lib/seo/composeSeoMeta.ts` is wrapped in React `cache()` — `generateMetadata` and the page body share a single computation. (b) JSON-LD ships ONLY on `/`, `/shop/[category]`, `/shop/[category]/[slug]` — verified by `view-source:` on `/cart`, `/checkout`, `/account/*` (zero `application/ld+json` scripts on those routes). (c) Each `opengraph-image.tsx` file declares `export const revalidate = 86400;`. Cold render < 600ms, warm < 50ms (CDN). (d) `apps/web/src/app/sitemap.ts` declares `export const revalidate = 3600;` and uses `getStorefrontProductsCached` etc., not the raw functions. Cold response < 500ms, warm < 50ms. (e) Bundle delta vs PF.4 baseline: storefront `/` first-load ≤ +10 KB gzip; PDP ≤ +8 KB gzip (JSON-LD generators are server-only so the delta is just metadata helpers in the RSC payload). (f) Lighthouse mobile PDP LCP within +50 ms; home within +30 ms. (g) `dynamic = "force-dynamic"` STILL on PDP. (h) Admin `/products` first-load JS ≤ +5 KB gzip (SeoPanel). (i) Settings page SEO tab save calls `bustAdminCaches()`. (j) Google Rich Results test green for one product + home. Squash-merge `phase-7-seo`.

---

## Phase 8 — Chat plugin

> Largest greenfield phase. Internal order: (A) foundations, (B) backend, (C) storefront UI, (D) admin UI, (E) end-to-end smoke. Do not skip ahead — backend has to be running before UI work is meaningful.

### Group A — Foundations

#### T8.1 Shared chat types

- **Goal:** Single source of truth for chat types shared between both apps.
- **Files:** `packages/shared/src/chat/types.ts`, `packages/shared/src/chat/index.ts`, `packages/shared/src/index.ts`.
- **Steps:**
  1. Export `ChatMessage`, `ChatThread`, `ChatThreadSummary`, `ChatStatus` matching PLAN.md §10/§12.3 interfaces.
  2. Re-export from `packages/shared/src/index.ts`.
- **Done when:** `import { ChatMessage } from "@store/shared"` works from both `@store/admin` and `@store/web`.
- **PLAN ref:** §10, §12.3.
- **Resume note:** —

#### T8.2 Guest JWT helpers

- **Goal:** Sign + verify the `inquiry_thread_token` cookie.
- **Files:** `packages/shared/src/chat/guestToken.ts`.
- **Steps:**
  1. Functions `signGuestToken({ inquiryIds, phoneNumber, days })` and `verifyGuestToken(token)`.
  2. Use `jsonwebtoken` (install in `packages/shared`). Sign with `process.env.AUTH_SECRET` (existing). HS256.
  3. Verification returns the payload or `null` on failure/expiry.
- **Done when:** unit-test in a throwaway script (sign + verify roundtrip works; expired token returns null). Delete the script before commit.
- **PLAN ref:** §12.2.
- **Resume note:** —

#### T8.3 ChatSettings UI tab on Settings page

- **Goal:** Surface the seven `chat.*` keys (seeded in T1.11) as an editable Chat tab in admin Settings.
- **Files:** `apps/admin/src/components/settings/ChatSettings.tsx`, `apps/admin/src/components/Settings.tsx` (add the tab).
- **Steps:**
  1. New "Chat" tab. Form with:
     - **Master toggle** for `chat.enabled` at the top, with a help text: "When off, the storefront ships zero chat-widget markup or JavaScript — perfect for promo mode or maintenance."
     - Toggle for `liveModeEnabled`, text for `websocketUrl`.
     - Two number inputs for poll intervals.
     - Number for `guestThreadTokenDays`.
     - Toggle for `attachmentsEnabled`.
  2. Save → PUT `/api/settings/store` (or whatever the existing settings update endpoint is). Single transaction. Save handler calls `bustAdminCaches()` so the storefront sees the new value on its next render (the storefront reads via `getStoreSettingsCached`, which is tagged for revalidation).
- **Done when:** can flip `chat.enabled` to `false`, save, reload the storefront, and confirm no `ChatFabShell` markup ships (`view-source:` returns zero matches for "chat-fab" or "ChatWidget").
- **PLAN ref:** §12.4, Appendix D § D.2 (Phase 8 Risk #3).
- **Resume note:** —

#### T8.4 chatTransport shared module — polling discipline (the second big chat perf risk)

- **Goal:** The polling-default, WebSocket-opt-in transport client. Used by both apps' chat UIs. **Architected so that a closed widget polls zero times and an open widget on a hidden tab polls infrequently** — see PLAN.md Appendix D § D.2 / Phase 8 Risk #2. The whole point is to avoid pounding Atlas with N+1 requests/sec when N customers are on the site.
- **Files:** `packages/shared/src/chat/chatTransport.ts`.
- **Steps:**
  1. `createChatTransport({ pollUrl, wsUrl, liveModeEnabled, onMessages, onError })` returns `{ start(), stop(), sendOptimistic(msg) }`.
  2. **Closed = stopped.** Until `start()` is called, the transport does literally nothing — no setInterval, no event listener, no fetch. The widget calls `start()` only when the panel opens; `stop()` when it closes.
  3. **Visibility-aware intervals.** When polling:
     - `document.visibilityState === "visible"` → 8s interval.
     - `document.visibilityState === "hidden"` → 30s interval.
     - Subscribe to `visibilitychange` to switch live; don't restart the clock — shift the next tick to the new cadence.
  4. **Idle backoff.** Track `lastActivityAt` (a new message in either direction). If no activity for 5 min AND tab is visible, back off to 20s. If no activity for 15 min, back off to 60s. Any new activity resets the cadence to 8s.
  5. **304 support.** Each poll sends `If-None-Match` based on the previous response's ETag (or `?since=<lastMessageAt>` if the server prefers query-param). Server returns 304 with empty body if nothing changed — round-trip is < 50 ms with no DB hit. The route handler in T8.6 must implement this.
  6. **WebSocket path (opt-in).** If `liveModeEnabled && wsUrl`: open WebSocket. On first frame received, cancel polling. On disconnect, resume polling and retry WS every 30s with jitter.
  7. **Cleanup on stop().** Clear timers, abort in-flight fetches, close WebSocket. Never leak a polling loop after the panel closes.
- **Done when:**
  - Unit-level: a throwaway script creates a transport, calls `start()`, observes one fetch within the first 8s, switches `document.visibilityState` via the test harness, and observes the interval shift to 30s. Stop and verify no further fetches occur. Throwaway deleted before commit.
  - Integration (after T8.11): open the chat widget on a real storefront, watch DevTools Network — close the panel, fetches stop within 1s. Re-open: fetches resume. Switch tabs (background the storefront): the interval visibly slows.
  - When the server returns 304, the transport handles it cleanly (does not call `onMessages`).
- **PLAN ref:** §12.4, Appendix D § D.2 (Phase 8 Risk #2).
- **Resume note:** —

### Group B — Backend APIs

#### T8.5 Storefront: POST `/storefront/inquiries/start`

- **Goal:** New endpoint for "create a thread" (used by widget empty state, PDP inquire, /sell). Enforces a real full-name on the customer's first message — admins will see and reply to whatever lands here.
- **Files:** `apps/web/src/app/api/storefront/inquiries/start/route.ts`, plus a shared validator in `packages/shared/src/chat/validators.ts` (or extend `chat/types.ts`) so the same regex is used by client + server.
- **Steps:**
  1. Body: `{ customerName, phoneNumber, body, subjectProductId? }`.
  2. **Validation (return 422 on failure, with `{ error, field }` so the UI can highlight):**
     - `customerName`: trim. Required. Length ≥ 2, ≤ 80. Match `/^[\p{L}\p{M}\s.'-]+$/u` (Unicode letters/marks + space/hyphen/period/apostrophe — supports Urdu, hyphenated, single-name cases). **Do NOT strictly require a space**: the UI label "Full name" + placeholder is the social nudge; rejecting single-name customers (rare but exists) is worse than accepting "Ahmed".
     - `phoneNumber`: trim. Use the existing phone-normalization helper if there is one (admin already validates phone elsewhere; reuse). Required.
     - `body`: trim. Length ≥ 1, ≤ 4000 (matches `Inquiry` message body limit from T1.7).
     - `subjectProductId`: optional, must be a valid ObjectId if present.
  3. Optional session: if signed in, use `session.customerId`; otherwise no customerId yet.
  4. Look up customer by phone — if a Customer doc with that phone exists, link `customerId` even on the guest path (so when they sign in later, history merges cleanly via T8.10's `inquiryClaim`).
  5. Create Inquiry. First message has `author: "customer"`, `authorName: customerName`, `body`, `createdAt: now`.
  6. If guest, sign a `inquiry_thread_token` with `{ inquiryIds: [<new>], phoneNumber }`, **appending** to existing cookie's `inquiryIds` if the cookie was already set (so a guest with multiple threads keeps access to all of them).
  7. Return `{ inquiryId }`. `Set-Cookie` header includes the updated guest token (HttpOnly, SameSite=Lax, Max-Age driven by `chat.guestThreadTokenDays * 86400`).
  8. **Rate limit / abuse protection.** This endpoint is the only fully-public write surface in the storefront — without throttling, a spammer creates unlimited Inquiry rows. **Reuse the existing helper at `apps/web/src/lib/api/publicRateLimit.ts`** — `enforcePublicRateLimit(request, { scope, identifier, max, windowMs })` already wraps the shared `checkRateLimit` + `getClientIp` + `tooManyRequests` from `packages/shared/src/rateLimit.ts` with IP+identifier binding (same helper is already used by OTP, login, and the legacy inquiry route — no new file, no duplicate token-bucket logic). Call it **twice** with distinct scopes:
     - First call — **IP cap:** `enforcePublicRateLimit(request, { scope: "inquiries:start:ip", max: 5, windowMs: 15 * MS_PER_MINUTE })`. Skip this call for requests with a valid signed-in session cookie (signed-in customers have already cleared an OTP — they're not the abuse vector).
     - Second call — **Phone cap:** `enforcePublicRateLimit(request, { scope: "inquiries:start:phone", identifier: normalizedPhone, max: 3, windowMs: 24 * MS_PER_HOUR })`.
     - Either call returning non-null → `return response` immediately (the helper produces a 429 with `Retry-After` from the underlying bucket).
     The same `enforcePublicRateLimit` helper is reused by `POST /messages` (T8.7 + T8.9) with `scope: "inquiries:message"`, `identifier: <inquiryId>:<authorKind>`, `max: 30`, `windowMs: MS_PER_MINUTE`. No new infra in either task — just additional `scope` strings.
- **Done when:**
  - `curl -X POST .../start -d '{"customerName":"Ahmed Khan","phoneNumber":"03001234567","body":"Hi"}'` returns 200 + `{ inquiryId }` + a `Set-Cookie` header.
  - `curl -X POST .../start -d '{"customerName":"A","phoneNumber":"03001234567","body":"Hi"}'` returns 422 with `{ error: "...", field: "customerName" }`.
  - `curl -X POST .../start -d '{"customerName":"123!@#","phoneNumber":"...","body":"Hi"}'` returns 422 (regex rejects).
  - `curl -X POST .../start -d '{"customerName":"محمد علی","phoneNumber":"...","body":"Hi"}'` returns 200 (Unicode passes).
  - Subsequent curl with the cookie can read the thread via T8.6.
  - **Rate-limit smoke:** firing 6 anonymous starts from the same IP within 1 min: the 6th returns `429 Too Many Requests` with a `Retry-After` header. Firing 4 starts with the same phone within an hour: the 4th returns 429.
- **PLAN ref:** §12 (guest path full-name nudge), §12.9 (API contract), T8.11 (UI consumer).
- **Resume note:** —

#### T8.6 Storefront: GET list + GET single (poll) — with summary + 304 support

- **Goal:** List threads visible to caller + single-thread polling. **Must support a cheap "summary" mode (just the unread count) so the FAB shell can hydrate its badge without fetching messages**, and **must return 304 Not Modified when nothing has changed since the caller's `If-None-Match` / `?since` value** — see PLAN.md Appendix D § D.2 / Phase 8 Risk #2 and T8.4.
- **Files:** `apps/web/src/app/api/storefront/inquiries/route.ts` (replace POST with GET), `apps/web/src/app/api/storefront/inquiries/[id]/route.ts`.
- **Steps:**
  1. GET `/storefront/inquiries`: signed in → by `customerId`; guest → by `inquiryIds` in cookie. Return `ChatThreadSummary[]`.
  2. GET `/storefront/inquiries?summary=1`: returns just `{ unreadByCustomer: number }` — single aggregation, no message arrays. The FAB shell uses this to render the badge dot without loading the full widget.
  3. GET `/storefront/inquiries/:id?since=<iso>`: authz check (`customerId` match OR cookie includes id). If the thread's `lastMessageAt` ≤ `since` AND no other field changed → return **`304 Not Modified`** with empty body. Otherwise return `{ thread, newMessages }` with an `ETag` header equal to the thread's `lastMessageAt`.
  4. Also support `If-None-Match` header (Express-style): if the header matches the current `lastMessageAt`, return 304.
  5. All authz failures return 401/403 with no body (no information leakage).
- **Done when:**
  - Widget can poll a thread and see new messages.
  - `curl -i 'https://.../api/storefront/inquiries?summary=1'` returns a small payload (< 200 bytes).
  - Polling the single endpoint with `?since=<lastMessageAt>` returns 304 in < 50 ms (verified via DevTools Timing).
- **PLAN ref:** §12.9, Appendix D § D.2 (Phase 8 Risk #2).
- **Resume note:** —

#### T8.7 Storefront: POST message + POST read

- **Goal:** Customer sends a message; customer marks agent messages read.
- **Files:** `apps/web/src/app/api/storefront/inquiries/[id]/messages/route.ts`, `apps/web/src/app/api/storefront/inquiries/[id]/read/route.ts`.
- **Steps:**
  1. POST `/messages`: authz check; push a message with `author: "customer"`, `authorName` from session/cookie. Set `lastMessage*`, increment `unreadByTeam`. If `status === "resolved"`, flip to `open` (reopen).
  2. POST `/read`: set `readByCustomerAt = now` on every agent message that lacks it; set `unreadByCustomer = 0`.
- **Done when:** customer sends a message → admin sees it next poll → admin replies → customer sees reply next poll → customer hits the route → `unreadByCustomer` is 0.
- **PLAN ref:** §12.9.
- **Resume note:** —

#### T8.8 Admin: GET inbox + GET single (poll)

- **Goal:** Admin inbox queries.
- **Files:** `apps/admin/src/app/api/inquiries/route.ts` (rewrite GET), `apps/admin/src/app/api/inquiries/[id]/route.ts` (rewrite GET).
- **Steps:**
  1. GET `/inquiries?filter=mine|unassigned|all|resolved&since=<iso>`. Returns `ChatThreadSummary[]` filtered + sorted by `lastMessageAt` desc. Respect `inquiry_view` permission.
  2. GET `/inquiries/:id?since=<iso>`. Returns full thread (including `internalNotes`) for callers with `inquiry_view`. 304-aware.
- **Done when:** admin inbox poll returns the right subset for each filter.
- **PLAN ref:** §12.9.
- **Resume note:** —

#### T8.9 Admin: POST message + PATCH + POST read

- **Goal:** Admin replies, edits status/assignee/notes, marks customer messages read.
- **Files:** `apps/admin/src/app/api/inquiries/[id]/messages/route.ts`, `apps/admin/src/app/api/inquiries/[id]/route.ts` (PATCH), `apps/admin/src/app/api/inquiries/[id]/read/route.ts`.
- **Steps:**
  1. POST `/messages`: permission `inquiry_manage`. Push agent message with `authorUserId = session.userId`, `authorName = session.userName`. Set `lastMessage*`, increment `unreadByCustomer`. If thread is unassigned, set `assignedToUserId = session.userId`. Flip `status = "awaiting-customer"`.
  2. PATCH `/inquiries/:id`: body `{ status?, assignedToUserId?, internalNotes? }`. Permission `inquiry_manage`.
  3. POST `/read`: set `readByTeamAt = now` on every customer message that lacks it; `unreadByTeam = 0`.
  4. Call `notifyOnNewMessage(inquiry, message)` (created in T8.18) at the end of POST `/messages`.
- **Done when:** admin reply → customer sees it next poll; admin marks resolved → customer's UI shows resolved banner.
- **PLAN ref:** §12.9.
- **Resume note:** —

#### T8.10 inquiryAccess.ts + inquiryClaim.ts

- **Goal:** Centralize the authz helper and the on-sign-in claim job.
- **Files:** `apps/admin/src/lib/auth/inquiryAccess.ts` (admin), `apps/web/src/lib/storefront/inquiryAccess.ts` (storefront), `apps/admin/src/lib/server/inquiryClaim.ts`.
- **Steps:**
  1. Admin-side helper: `canViewInquiry(session, inquiry)` and `canManageInquiry(session, inquiry)` returning booleans.
  2. Storefront-side helper: `canCustomerSeeInquiry(session, cookieToken, inquiry)` — true if `customerId` matches OR cookie token includes the inquiry id.
  3. `inquiryClaim.ts`: `claimInquiriesForCustomer(customer)` runs `Inquiry.updateMany({ phoneNumber: customer.phoneNumber, customerId: null }, { $set: { customerId: customer._id } })`. Hook into the storefront sign-in callback so it runs on every successful sign-in.
- **Done when:** customer signs in for the first time and previously-guest threads under the same phone show up in `/account/messages`.
- **PLAN ref:** §12.2, §12.7.
- **Resume note:** —

### Group C — Storefront UI

#### T8.11 ChatWidget — pure-CSS FAB shell + dynamically-imported panel

- **Goal:** The floating chat button on every storefront page; the slide-up panel; the first-time name/phone/body prompt. **Architected so the initial-load bundle delta is ≤ +2 KB gzipped** — see PLAN.md Appendix D § D.2 / Phase 8 Risk #1. The panel only loads JS when the user clicks the FAB. The whole widget only mounts when `chat.enabled` setting is true.
- **Files:**
  - `apps/web/src/components/chat/ChatFabShell.tsx` (new — the tiny inline shell, ~1 KB).
  - `apps/web/src/components/chat/ChatWidget.tsx` (the heavy panel — only imported via `next/dynamic` inside ChatFabShell).
  - `apps/web/src/components/chat/ChatWidgetEmptyState.tsx`.
  - `apps/web/src/components/layout/StorefrontChrome.tsx` (mount the FAB shell here, not in layout.tsx — layout stays server-only).
- **Steps:**
  1. **`ChatFabShell.tsx`** is a client component (`"use client"`) but contains only: a CSS-positioned button (`fixed bottom-4 right-4`, 56×56), an inline SVG chat icon, and `useState<boolean>(false)` for "panel open". Imports nothing heavy.
  2. The shell reads `chat.enabled` from `StoreSettingsContext` (already loaded at the root). If `false`, returns `null` — zero markup, zero JS for visitors when admin has disabled chat.
  3. On FAB click, lazily import the panel via `next/dynamic`:
     ```ts
     const ChatWidget = dynamic(
       () => import("./ChatWidget").then((m) => m.ChatWidget),
       { ssr: false, loading: () => <div className="chat-widget-skeleton" /> }
     );
     ```
     The skeleton is also pure CSS (no JS).
  4. **`ChatWidget.tsx`** is the heavy component: holds `chatTransport`, fetches/polls threads, renders the messages list and composer.
  5. Panel: 380×560 on tablet+, fullscreen on `<640px`. Slide-in uses `transform: translateY(...)` only (compositor pathway — no layout reflow).
  6. Determine "has thread" by hitting `/storefront/inquiries`. If empty → `ChatWidgetEmptyState`. If has one or more → show the most recent thread.
  7. **EmptyState form** (mounted inside the panel when the guest has no thread for this browser, AND not signed in):
     - **Full name** input — label literally reads "Full name", placeholder "e.g. Ahmed Khan", `autoComplete="name"`, `inputMode="text"`. Client-side validation mirrors T8.5 (trim, ≥ 2 chars, regex `/^[\p{L}\p{M}\s.'-]+$/u`). Show inline error "Please enter your full name" on blur if invalid.
     - **Phone** input — `type="tel"`, `autoComplete="tel"`, `inputMode="tel"`. Required.
     - **First-message textarea** — `placeholder="What can we help you with?"`, required, 1–4000 chars.
     - **Send** button — disabled until all three fields are valid. On click: POST `/storefront/inquiries/start` via `storefrontFetch`. On 422 (server validation failure), surface `{ error, field }` from the response into the matching field's error slot. On success: switch to thread view (T8.12) and persist the panel-open state to localStorage so reload keeps the thread visible.
     - Signed-in customers skip this form entirely — the widget uses `session.customerName` + `session.phoneNumber` from `useStoreSettings`-style context and POSTs directly with the first message.
  8. Hide the FAB on `/account/sign-in` and `/checkout` (read `usePathname`; render `null` when path starts with those prefixes).
  9. The badge dot on the FAB is driven by a tiny `localStorage`-cached `unreadByCustomer` count seeded from a single ping to `/storefront/inquiries?summary=1` (returns just `{ unreadByCustomer: number }`). The full polling loop is only started when the panel opens.
- **Done when:**
  - Build the storefront. The route chunk for `/` should NOT include `ChatWidget.tsx`'s code (verify via `npm run build:web` output: look for a separate chunk named after ChatWidget; the route chunk excludes its bytes).
  - Opening the storefront homepage shows the FAB; toggling `chat.enabled` to `false` in the Settings page and reloading produces a page with no FAB and no JS for the widget.
  - Clicking the FAB triggers the dynamic import (DevTools Network shows a `_next/static/chunks/.../ChatWidget-*.js` request the FIRST time, cached thereafter).
  - The empty state submits and switches to thread view (built in T8.12).
  - DevTools Performance trace of FAB click → panel open shows zero forced reflows; transform-only animation.
- **PLAN ref:** §12.5, Appendix D § D.2 (Phase 8 Risk #1).
- **Resume note:** —

#### T8.12 ChatThread + ChatComposer

- **Goal:** Message list + composer, reusable between the widget and `/account/messages`.
- **Files:** `apps/web/src/components/chat/ChatThread.tsx`, `apps/web/src/components/chat/ChatComposer.tsx`.
- **Steps:**
  1. ChatThread: renders messages — customer right-aligned, agent left with avatar circle. Auto-scrolls to bottom on new messages. Shows "resolved" banner when `status === "resolved"`.
  2. ChatComposer: textarea + Send. Optimistic append on Send (gray until server confirms). Disabled while composing if `attachmentsEnabled` is false and the user pastes an image.
  3. Uses `chatTransport` (T8.4) to poll for updates; on every poll response, calls `/storefront/inquiries/:id/read`.
- **Done when:** widget → send a message → admin replies (curl) → widget shows the reply within 5s.
- **PLAN ref:** §12.5.
- **Resume note:** —

#### T8.13 `/account/messages` page

- **Goal:** Signed-in two-pane inbox view.
- **Files:** `apps/web/src/app/account/messages/page.tsx`, `apps/web/src/app/account/messages/[id]/page.tsx`, `apps/web/src/components/account/MessagesView.tsx`.
- **Steps:**
  1. `page.tsx`: server component, requires session, loads threads via `getAccountInquiries(customerId)`.
  2. MessagesView: two-pane layout. Left = thread list (mobile shows only one at a time). Right = selected ChatThread + ChatComposer.
  3. Add a "Messages" entry to the account nav.
- **Done when:** signed-in customer at `/account/messages` sees all their threads; selecting one shows the conversation; replying works.
- **PLAN ref:** §12.5.
- **Resume note:** —

#### T8.14 PDP "Inquire about this" button

- **Goal:** Wire the existing PDP CTA to the widget with `subjectProductId` and a pre-seeded body.
- **Files:** `apps/web/src/app/shop/[category]/[slug]/page.tsx` (or the PDP component), the widget's open API.
- **Steps:**
  1. Expose a small client-side function `openChatWidget({ subjectProductId, seedBody })` from the widget (e.g. via a global event or a React context).
  2. PDP button calls it with the product id and a templated body `"Hi, I'd like more info on <name>."`.
- **Done when:** clicking "Inquire about this" opens the widget with the seeded text pre-filled.
- **PLAN ref:** §12.5.
- **Resume note:** —

#### T8.15 `/sell` form → Inquiry first message

- **Goal:** The existing `/sell` page submit creates an Inquiry whose `messages[0]` is the structured form content. Same full-name discipline as the chat widget (T8.11).
- **Files:** `apps/web/src/app/sell/page.tsx` (or wherever the form lives), `apps/web/src/components/sell/SellForm.tsx`.
- **Steps:**
  1. The form's name field is labelled "Full name" with the same placeholder + validation rules as T8.11 (Unicode-friendly regex, ≥ 2 chars). Use the shared validator from `packages/shared/src/chat/validators.ts` introduced in T8.5 so client + server agree.
  2. On submit: build a formatted body string from the form fields (per PLAN §12.5).
  3. POST `/storefront/inquiries/start` with `{ customerName, phoneNumber, body }`. Reuse the same endpoint — no parallel route.
  4. On 422, surface `{ error, field }` into the matching form field.
  5. On success: if signed in, redirect to `/account/messages/<id>`; otherwise show a "Thanks — your request is sent. Continue this chat anytime" with a button that opens the widget on this browser using the just-set cookie.
- **Done when:** /sell submission ends up as a properly-formatted first message in admin's inquiries inbox. Submitting with a one-character or symbol-only name shows an inline field error.
- **PLAN ref:** §12.5, §12 (guest path full-name nudge).
- **Resume note:** —

### Group D — Admin UI

#### T8.16 Admin inbox two-pane layout

- **Goal:** Replace the existing flat-table `/inquiries` page with the two-pane inbox layout.
- **Files:** `apps/admin/src/app/inquiries/page.tsx`, `apps/admin/src/components/inquiries/InquiriesInbox.tsx`.
- **Steps:**
  1. Page becomes a server component that loads the initial filter (default `mine`) and passes to InquiriesInbox.
  2. InquiriesInbox: holds filter chip state, calls GET `/api/inquiries?filter=...` on each filter change, passes the thread list to `<ThreadList>`, holds the selected id, passes to `<ThreadPanel>`.
- **Done when:** /inquiries page shows the filter chips at top, thread list on left, thread on right.
- **PLAN ref:** §12.6.
- **Resume note:** —

#### T8.17 ThreadList + ThreadPanel + ThreadHeader + InternalNoteEditor

- **Goal:** Build out the inbox components.
- **Files:** `apps/admin/src/components/inquiries/ThreadList.tsx`, `ThreadPanel.tsx`, `ThreadHeader.tsx`, `InternalNoteEditor.tsx`.
- **Steps:**
  1. ThreadList rows: unread dot, customer name + time-ago, last preview, assignee chip.
  2. ThreadPanel: ChatThread (reused from storefront via shared shape) + admin-version composer (no attachment gating; admins always get attachments), plus action bar (Mark resolved, Reassign).
  3. ThreadHeader: customer name + product context + status pill + assign dropdown.
  4. InternalNoteEditor: collapsed at bottom; expanding shows a textarea bound to `inquiry.internalNotes`. Save = PATCH.
- **Done when:** admin can reply, mark resolved, reassign, edit internal note. UI matches the ASCII sketch in PLAN §12.6.
- **PLAN ref:** §12.6.
- **Resume note:** —

#### T8.18 notifyOnNewMessage stub + in-app indicators

- **Goal:** Centralized notification hook + the badge wiring.
- **Files:** `apps/admin/src/lib/notifications/chatNotifications.ts`, sidebar component (whatever wires the Inquiries icon).
- **Steps:**
  1. `notifyOnNewMessage(inquiry, message)`: no-op for now; reads `process.env.RESEND_API_KEY` / `process.env.TWILIO_*` and would send if set, but the function body for those is left as `// TODO: post-MVP`.
  2. Sidebar `Inquiries` icon: query `Inquiry.find({ status: { $ne: "resolved" }, unreadByTeam: { $gt: 0 } }).count()` and show a red dot when > 0. Poll every 30s in the layout.
  3. Customer-side: widget FAB badge already wired in T8.11; also flash the page title `"*New message · Ibrahim Mobiles"` when a backgrounded tab receives an agent message.
- **Done when:** sending a message as customer makes the admin sidebar show a red dot; sending as admin makes the customer's tab title flash.
- **PLAN ref:** §12.8.
- **Resume note:** —

### Group E — Validate

#### T8.19 End-to-end chat smoke

- **Goal:** Walk through the full happy path against real prod-like data.
- **Files:** none.
- **Steps:**
  1. Open storefront in private window. Open widget. Submit name/phone/first message.
  2. Open admin in another browser. Confirm thread appears in `Unassigned` filter.
  3. Reply as admin. Confirm thread auto-assigned to me; status = `awaiting-customer`.
  4. Switch to storefront tab — confirm reply appears within 5s.
  5. Reply as customer; confirm admin sees within 5s; status flips back to `open`.
  6. Mark resolved as admin. Confirm customer's widget shows resolved banner.
  7. Reply as customer. Confirm thread reopens.
  8. Sign in on storefront with the same phone. Go to `/account/messages`. Confirm guest thread is now claimed.
  9. PATCH internal note as admin. Confirm customer endpoint does NOT return the note.
- **Done when:** all 9 steps pass without console errors. Any deviation files a new task in this file at the appropriate group.
- **PLAN ref:** §12.
- **Resume note:** —

**Phase 8 exit criteria:** end-to-end smoke (T8.19) passes. **Perf checkpoint (PLAN.md Appendix D § D.2 / Phase 8 + § D.3 — the highest-risk phase in the plan):**

- (a) Build the storefront. The `/` route chunk does NOT include the bytes of `ChatWidget.tsx`, `ChatThread.tsx`, `ChatComposer.tsx`, `chatTransport.ts`, or `guestToken.ts`. Verify by inspecting the build output for a separate `chat-widget-*.js` async chunk.
- (b) `view-source:` on the storefront home page with `chat.enabled = false`: zero matches for "chat" in the HTML, zero JS chunks loaded for chat.
- (c) Storefront bundle delta vs PF.4 baseline: home + PDP first-load JS ≤ **+2 KB gzip** each (the FAB shell + dynamic-import wrapper only). The async chat chunk itself ≤ 50 KB gzip.
- (d) Open chat panel, observe DevTools Network: polling starts at 8s interval when visible. Switch tabs: polling slows to 30s. Close the panel: polling stops within 1s — zero fetches afterwards.
- (e) `If-None-Match` / `?since=<lastMessageAt>` returns 304 with empty body in < 50 ms (DevTools timing).
- (f) Lighthouse mobile home LCP within +50 ms of baseline; PDP LCP within +50 ms of baseline (or post-Phase-7 result, whichever is current).
- (g) CLS = 0 contribution from the FAB (the page layout doesn't shift when the FAB renders).
- (h) Flip `chat.enabled` to `false` → reload storefront → flip back to `true` → reload: confirm cache-tag revalidation propagates within 5s.

Squash-merge `phase-8-chat`.

---

## Phase 8.5 — Chat attachments

> Depends on Phase 2 (Vercel Blob upload route).

### T8.5.1 Wire ChatComposer to upload route

- **Goal:** Composer supports image/file uploads via the existing `/api/uploads` route. Image attachments flow through the same `StoredImage` pipeline as everything else in the app (T2.2 + T2.3); non-image files (PDFs etc.) take a raw URL path that bypasses `sharp`.
- **Files:** `apps/web/src/components/chat/ChatComposer.tsx`, `apps/admin/src/components/inquiries/ThreadPanel.tsx`, `apps/web/src/app/api/storefront/uploads/route.ts` (new).
- **Steps:**
  1. Add an "Attach" button next to Send.
  2. Click → file picker. For each file:
     - **If MIME is `image/*`:** POST to `/api/uploads` (admin uses the existing route; storefront uses a new parallel route `apps/web/src/app/api/storefront/uploads/route.ts` modeled on the admin one, gated by session OR guest cookie). Route returns a `StoredImage`. Build `{ kind: "image", image: StoredImage }`.
     - **Else (PDF, etc.):** POST to the same route with `kind=file` so it skips `sharp` and stores the raw blob. Response returns `{ url, mime, sizeBytes, filename }`. Build `{ kind: "file", url, mime, sizeBytes, filename }`.
  3. Show thumbnails (for image attachments — use `image.variants.thumb`) and filename pills (for file attachments) above the textarea. Allow removing a pending attachment before Send.
  4. On Send, include the array as `attachments: Array<{ kind: "image"; image: StoredImage } | { kind: "file"; url; mime; sizeBytes; filename }>` matching the InquiryMessage schema from T1.7 (which already declared this shape in Phase 1 so no DB migration is needed here).
- **Done when:** sending a message with an image renders inline as `image.variants.thumb` on both sides; clicking the thumb opens the lightbox using `image.variants.full`. Sending a PDF shows a filename pill that downloads on click. The composer's wire format matches `InquiryMessage.attachments` 1:1 — no shim, no translation layer.
- **PLAN ref:** §10 (InquiryMessage.attachments), §12.5, §12.4, T1.1.5 (universal StoredImage), T2.3 (single uploader rule).
- **Resume note:** —

### T8.5.2 Flip the `chat.attachmentsEnabled` setting

- **Goal:** Hide the Attach button when the setting is off; show when on.
- **Files:** `apps/web/src/components/chat/ChatComposer.tsx`, `apps/admin/src/components/inquiries/ThreadPanel.tsx`.
- **Steps:**
  1. Both composers read the setting on mount (via a shared `useChatSettings()` hook).
  2. Hide Attach button when false.
- **Done when:** toggling the setting in admin Settings page hides/shows the Attach button on next reload.
- **PLAN ref:** §12.4.
- **Resume note:** —

**Phase 8.5 exit criteria:** users can attach images to chat. Squash-merge `phase-8-5-attachments`.

---

## Phase 9 — WebSocket broker (optional, post-EC2)

> Run this phase only after the EC2 migration is live and a WebSocket-capable server is reachable at `wss://chat.<domain>`.

### T9.1 Deploy WebSocket broker

- **Goal:** Out-of-repo task. Stand up a Node WebSocket server on EC2 (or a separate Vercel-incompatible host) that:
  1. Accepts authenticated WS connections at `/inquiry/:id` (storefront) and `/inbox` (admin).
  2. On connection: verifies cookie / session against the same auth rules as the polling endpoints.
  3. On message-create in DB (via change streams or an internal HTTP webhook from the Next.js APIs), broadcasts to subscribed sockets.
- **Done when:** broker is reachable; manual test from a CLI WS client receives a frame after POSTing a message via the HTTP API.
- **PLAN ref:** §12.4.
- **Resume note:** —

### T9.2 Configure settings + DNS

- **Goal:** Flip the runtime switch.
- **Files:** Settings collection (admin UI).
- **Steps:**
  1. Set `chat.websocketUrl` to `wss://chat.<domain>`.
  2. Flip `chat.liveModeEnabled` to `true`.
- **Done when:** browser DevTools shows a WS connection open to the broker when a chat is open.
- **PLAN ref:** §12.4.
- **Resume note:** —

### T9.3 Validate live mode + fallback

- **Goal:** Confirm WebSocket pushes work and polling fallback engages on disconnect.
- **Files:** none.
- **Steps:**
  1. Open widget. Verify message delivery latency < 1s.
  2. Kill the WS server. Confirm client falls back to polling within 30s.
  3. Restart WS server. Confirm client re-connects.
- **Done when:** all three transitions work cleanly. Tag the prod commit `v1.0.0-live-chat`.
- **PLAN ref:** §12.4.
- **Resume note:** —

**Phase 9 exit criteria:** live mode works end-to-end. Squash-merge `phase-9-websocket`.

---

## Post-execution cleanup

After all phases ship and a 7-day soak with no rollbacks:

- [ ] Delete `PLAN.md` and `TASKS.md` (per `vibeCodingRules` Dead File Policy — they were planning artifacts; their history lives in git).
- [ ] Delete the `./backups/<date>` folder (or move to long-term storage outside the repo).
- [ ] Squash any remaining `wip:` commits.
- [ ] Run the `vibeCodingRules` Dead Field Policy audit one more time to confirm no new dead fields landed during execution.

---

## Baseline metrics (filled in at PF.1 + PF.4)

> Fill these in once at the start so later regression checks have a reference. Numbers feed into the perf checkpoints baked into every storefront-touching phase's exit criteria (see PLAN.md Appendix D § D.3 § D.4).

### Lint / typecheck (PF.1)

- `npm run typecheck` baseline errors: **0** across `@store/admin`, `@store/db`, `@store/shared`, `@store/web` (turbo cache hit on web + admin).
- `npm run lint` baseline errors: **0** on `main` (the lint error noted during the wip-branch baseline was on a modified `page.tsx` that does not exist on `main`; phase-0 branches start clean).
- Tool versions captured: node **v25.9.0** (engines pin `>=22 <23`; warning-only mismatch, lint+typecheck pass cleanly under 25.x), npm **11.12.1**, turbo **2.9.14**.

### Storefront First Load JS (PF.4)

> **Tooling note:** Next.js 16 Turbopack does **not** print per-route First Load JS in stdout (unlike the legacy webpack build). We're capturing aggregate metrics from `.next/static/chunks` + `build-manifest.json` instead, and will add `@next/bundle-analyzer` before Phase 6 (storefront PDP) for proper per-route breakdown.

- **Total `static/chunks` size (uncompressed):** 1.1 MB across ~600 hashed chunks.
- **`rootMainFiles` (loaded on every route):** 5 chunks listed in `build-manifest.json` — `00290n_8bchkn.js`, `0mkwaz2p830-i.js`, `0zrgh3ujkma31.js`, `0l1_47-31-frg.js`, `turbopack-0x1sj9ezv6xke.js`. Combined uncompressed: ~510 KB (`0l1_47-31-frg.js` alone is 232 KB — that's the framework shell). Estimated gzip: ~155 KB. This is the floor for every page's First Load JS.
- **Routes shipped to prod (per build output):** static (○) — `/`, `/_not-found`, `/cart`, `/checkout`, `/deals`, `/shop`, `/sitemap.xml`, `/robots.txt`, `/track`, `/wishlist`. Dynamic (ƒ) — `/account/*`, `/api/storefront/*`, `/shop/[category]`, `/shop/[category]/[slug]`, `/checkout/success`.
- **Build time:** Compile 3.9s + Typecheck 8.1s + Static-page generation 3.4s = 19s end-to-end with cold turbo cache.

### Admin First Load JS (PF.4)

- _Skipped at baseline._ Same Turbopack limitation. Will add bundle-analyzer in Phase 3 (categories workspace ships the first new admin client code).

### Lighthouse (PF.4 — Mobile profile, Fast 3G + Slow 4G CPU, median of 3 runs)

- Home LCP: _TBD ms_  |  CLS: _TBD_  |  TBT: _TBD ms_  |  INP: _TBD ms_
- PDP LCP: _TBD ms_  |  CLS: _TBD_  |  TBT: _TBD ms_  |  INP: _TBD ms_

### Network (PF.4 — DevTools, RSC requests)

- Home RSC document fetches: _TBD_
- PDP RSC document fetches: _TBD_

### Sitemap (PF.4 — `curl -w '%{time_total}\n' ...`, two calls)

- Cold: _TBD ms_  |  Warm: _TBD ms_

### Re-measured at the end of each storefront-touching phase

Append rows below as each phase ships, comparing against baseline. Investigate any cell that breaches the "Hard ceiling" column in PLAN.md Appendix D § D.3 before moving to the next phase.

- Phase 6 exit: _TBD_
- Phase 7 exit: _TBD_
- Phase 8 exit: _TBD_
