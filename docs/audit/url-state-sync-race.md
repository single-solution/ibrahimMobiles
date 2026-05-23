# Audit: URL ↔ local state sync race (sidebar flicker)

**Tag for search:** `AUDIT:url-state-sync-race`

## Symptom

UI updates immediately on user action, then **flickers back** to the previous value, then settles on the correct value. Common when changing sidebar selection while `?category=` (or similar) is in the URL.

## Root cause

1. Click handler sets **local React state** and calls `router.replace()` to update the URL.
2. `router.replace` is **async** — `useSearchParams()` still returns the old param for one or more renders.
3. A `useEffect` syncs state **from** `searchParams`, with **`selectedX` in the dependency array**.
4. Effect runs after the local state update, sees `selectedX !== fromUrl`, and **overwrites** state with the stale URL value.
5. When navigation completes, the effect runs again and applies the new URL.

## Anti-pattern

```tsx
const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

const select = (slug: string) => {
  setSelectedSlug(slug);
  router.replace(`/page?category=${slug}`, { scroll: false });
};

useEffect(() => {
  const fromUrl = searchParams.get("category");
  if (fromUrl && nav.some((row) => row.slug === fromUrl)) {
    if (selectedSlug !== fromUrl) {
      setSelectedSlug(fromUrl); // ← overwrites optimistic selection while URL is stale
    }
    return;
  }
  if (selectedSlug !== null) return;
  setSelectedSlug(defaultSlug);
  router.replace(/* ... */);
}, [nav, searchParams, selectedSlug, router]); // ← selectedSlug in deps triggers the race
```

## Fix pattern

1. **Remove** selection state from the URL-sync effect dependencies.
2. Track an optimistic slug in a **ref** until `searchParams` matches.

```tsx
const pendingSlugRef = useRef<string | null>(null);

const select = (slug: string) => {
  pendingSlugRef.current = slug;
  setSelectedSlug(slug);
  setCategoryUrl(slug);
};

useEffect(() => {
  const fromUrl = searchParams.get("category");
  const pending = pendingSlugRef.current;

  if (pending) {
    if (fromUrl === pending) {
      pendingSlugRef.current = null;
    } else {
      return; // URL not caught up — keep optimistic UI
    }
  }

  if (fromUrl && nav.some((row) => row.slug === fromUrl)) {
    setSelectedSlug(fromUrl);
    return;
  }
  // default when URL missing/invalid only
}, [nav, searchParams, setCategoryUrl]);
```

Alternative: **URL as single source of truth** — only update URL on click; derive selection from `searchParams` (no duplicate state). Accepts one-frame delay unless using `useOptimistic`.

## Fixed in this repo

| File | Notes |
|------|--------|
| `apps/admin/src/components/products/ProductsCatalog.tsx` | `pendingCategorySlugRef`, `pendingProductQueryRef`, `pendingListFilterRef`, `pendingDeleteIdRef` |
| `apps/admin/src/components/categories/CategoriesCatalog.tsx` | `pendingCategorySlugRef`, `pendingDrawerRef`, `pendingRowQueryRef`, `pendingDeleteRef` |
| `apps/admin/src/components/products/ProductWizardStep2.tsx` | `pendingVgradeRef`, `pendingVuidRef` (manage mode) |
| `apps/admin/src/components/products/ProductCreateWizard.tsx` | `pendingWizardRef` |
| `apps/web/src/components/shared/VariantContext.tsx` | `pendingVariantIdRef` |
| `apps/web/src/components/shared/VariantSelector.tsx` | `pendingSelectionSigRef` |

## Project scan

Run from repo root:

```bash
# Local state + URL params (review each hit)
rg -l "useSearchParams" apps --glob "*.tsx"

# Effects that may sync URL → state (inspect deps for local selection state)
rg "searchParams\.get" apps -g "*.tsx" -A 8 | rg -B 20 "useEffect"

# router.replace + parallel useState selection
rg "router\.replace" apps -g "*.tsx" -l

# Suspicious: selection state listed in effect deps alongside searchParams
rg "searchParams.*selected|selected.*searchParams" apps -g "*.tsx"
```

### Manual review checklist

- [ ] `useState` for filter/tab/selection **and** `useSearchParams` for the same concern?
- [ ] `useEffect` copies `searchParams` → state while that state is also set in click handlers?
- [ ] Effect dependency array includes **both** `searchParams` and the mirrored local state?
- [ ] `router.replace` / `router.push` used without pending/optimistic guard?

### High-priority files to review

| File | Why |
|------|-----|
| `apps/web/src/lib/storefront/useFilterParams.ts` | Filters in URL + local state |
| `apps/web/src/components/shared/FilterSidebar.tsx` | Filter UI |
| `apps/web/src/components/shared/ShopPagination.tsx` | Page in URL |
| `apps/admin/src/components/products/ProductCreateWizard.tsx` | `searchParams` + `router.replace` |
| `apps/web/src/components/layout/NavigationProgress.tsx` | Route key from pathname + searchParams |

## Related

- Next.js App Router: `useSearchParams()` updates after navigation; do not assume synchronous URL/state alignment after `router.replace`.
