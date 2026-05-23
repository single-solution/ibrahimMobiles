# PDP Configurator — Current vs Change

> Status: **Implemented.** Open questions resolved in code as noted.

---

## What we currently have (and keep)

- PDP shows chips per row (Grade + attributes).
- When user clicks an attribute and no exact variant matches, we **auto-jump to the closest variant** (which may switch grade silently). **Kept as-is.**
- Out-of-stock attribute chips are shown with a dashed border / strikethrough (`unavailable` state). **Kept as-is.**
- A “Closest match — ask on WhatsApp” banner appears when the combo doesn’t match exactly.
- URL was using opaque `?variant=<id>`; now using `?grade=…&<attribute>=…` (last session).
- Server redirects URL to canonical when query doesn’t match resolved variant → **causes full reload** on every chip click. This is the main bug we fix.

---

## What we change

### 1. Grade row visibility

- A grade is shown if and only if the product has **at least one variant** under it (any stock). Grades with zero variants are hidden entirely.
- Grade chips are **always clickable**. No disabled state for grades.

### 2. All attributes have equal weight inside a grade

Today: color switching can misbehave because the matcher pins some attributes more strongly than others (e.g. SIM is treated as the primary axis).
New:

- Every attribute chip is treated symmetrically by the matcher.
- Clicking color, storage, or SIM all narrow the other rows the same way.
- Auto-jump to closest variant still happens (kept from current behaviour), but the **clicked attribute is always honored** — the click is never silently ignored.

### 3. Required vs optional dimensions

- **Grade** — pre-selected on load (first grade with a variant, in-stock preferred).
- **Required attributes** — every attribute marked as required for the PDP (could be SIM, could be Storage, could be Network, etc. — defined per attribute, not hardcoded). Not pre-selected. Required for price to appear.
- **Optional attributes** — not pre-selected. If user doesn’t touch them, we silently use the **first available** value for matching.

“Required” only controls when **price/CTA** unlock; it does not give required attributes matching priority over other attributes (§2). The logic is generic — it works whether one, two, or zero attributes are marked required.

### 4. Price / stock / CTA gating

Today: shown for any current selection.
New:

- Grade + **all required attributes** picked → resolve variant → show price/stock, enable Add to cart (if in stock).
- Any required attribute missing → show **“Select <attribute name> to see price.”** Add to cart disabled.
- Resolved variant has zero stock → show **“Sold out”** message in place of Add to cart. Do not reset chips, do not redirect.

### 5. URL behaviour (seamless, no reload)

Today: chip clicks can trigger a server redirect → full page reload.
New:

- URL only contains what the user **explicitly** picked, plus the pre-selected grade.
- Every chip click updates the URL via `router.replace({ scroll: false })` — **no full page reload, no scroll jump, no re-fetch of the product**.
- The PDP server route never calls `redirect()` for configurator state. It only reads the URL once on first request for SEO/initial render.
- Refreshing the page restores the same selection from the URL.
- Sharing the URL opens the same selection for the recipient.

### 6. Bookmark / shared link with impossible combo

Today: closest variant + WhatsApp banner.
New:

- If the URL describes a combination that **maps to a real variant** (in-stock or out-of-stock) → render that variant. Out-of-stock just shows the OOS state in CTA (no chip reset).
- If the URL describes a combination that **does not exist on any variant** → fall back to the **default variant** (same as a fresh load: first grade pre-selected, no chips picked). URL is cleaned via `router.replace` so the bad params are dropped. No reload.

### 7. Product card links pass the full configuration

Today: product card links to `/shop/<category>/<slug>` (sometimes with `?variant=<id>`).
New:

- Every product card builds the link using the **full URL configuration** of the variant it is displaying — grade + every attribute the variant has.
- When the user clicks the card, the PDP opens on **exactly the same SKU** they were looking at on the grid.
- The same rule applies to cart line links, related-products rails, and search hits.

### 8. Multi-value variant chips (Black + Violet on one SKU)

Today: shows one chip per value (recent fix).
New: keep that, and clicking either value resolves to the **same** variant (same price/stock). URL behaviour pending Open Q3.

---

## Example — Samsung Galaxy S24 Ultra

| # | Grade | SIM | Storage | Color | Price | Stock |
|---|-------|-----|---------|-------|-------|-------|
| V1 | Brand new | Dual physical | 256GB | Black | 350k | 2 |
| V2 | Brand new | Dual physical | 512GB | Black | 380k | 0 |
| V3 | Brand new | eSIM only | 256GB | Black | 340k | 3 |
| V4 | Brand new | Dual physical | 256GB | Black + Violet | 355k | 4 |
| V5 | For repair | Dual physical | 256GB | Gray | 280k | 1 |

Grade display order: Brand new → For repair.

| Step | Action | UI result | URL |
|------|--------|-----------|-----|
| 0 | Land on PDP | Brand new pre-selected. Required attribute rows empty. **“Select <required> to see price.”** | `…/s24-ultra?grade=brand-new` |
| 1 | Open from shop card showing V4 | PDP loads V4 directly (Brand new, dual physical, 256GB, Violet). Price **355k / 4 in stock**. | `?grade=brand-new&sim=dual-physical&storage=256gb&color=titanium-violet` |
| 2 | Tap Color = Black on V4’s link | Resolves to V1 (or stays on V4 since Black is also on V4). Price reflects the new variant. | URL updates with new color via `router.replace`. |
| 3 | Open URL pointing at V2 (OOS) | V2 loads. Chips show its config. CTA shows **“Sold out.”** No reset. | unchanged |
| 4 | Open stale link `?grade=brand-new&sim=esim&storage=512gb` (no variant exists) | Fall back to default variant (same as fresh load). Bad params dropped from URL via `router.replace`. | `?grade=brand-new` |
| 5 | Refresh any of the above | Same state restored from URL. No reload after hydration. | unchanged |

---

## Files we touch

| File | Change |
|------|--------|
| `apps/web/src/lib/catalog/pdpSelection.ts` | Adjust `resolvePickerSelection` so every clicked attribute is treated as the priority axis (fixes color switching). Keep closest-variant fallback. Add fallback-to-default when URL combo doesn’t map to any variant. |
| `apps/web/src/components/shared/VariantSelector.tsx` | Hide grade chips with zero variants. Gate price/CTA on Grade + every required attribute. Show "Sold out" CTA state when resolved variant has zero stock. Keep `unavailable` chip rendering for attributes. |
| `apps/web/src/app/shop/[category]/[slug]/page.tsx` | Remove configurator-state redirect; server only reads URL for initial render + SEO. |
| `apps/web/src/lib/catalog/productPaths.ts` | Already builds links with full selection; verify every consumer (`ProductCard`, cart lines, related rails, search) passes the variant being shown so the link is fully qualified. |

---

## Open questions (please decide before coding)

1. **Required-attribute marker.** How do we know which attribute is required for price? Reading a flag from the existing attribute data is the natural answer — does that flag already exist, or do we treat “every attribute is required” as the default and refine later?
2. **Pre-selected grade in URL on landing.** Include `?grade=brand-new` after hydration, or only after the user clicks a grade chip?
3. **Multi-value variant URL.** When clicking Violet on a Black+Violet SKU, include `?color=titanium-violet` (A) or omit because the variant doesn’t change (B)?
