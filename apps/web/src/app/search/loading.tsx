import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { ProductGridSkeleton } from "@/components/shared/ProductCardSkeleton";

/**
 * Search-page-shaped fallback. Mirrors `app/search/page.tsx`:
 *   - title block (eyebrow + heading + subtitle)
 *   - product grid (2 cols mobile, 3 md, 4 lg) sized for one viewport.
 *
 * Until this file existed the segment fell back to the parent home
 * skeleton — which paints a 5-tile fan hero followed by category tiles —
 * which is the wrong shape for `/search?q=…`, causing a visible layout
 * snap when the real results arrived.
 */
const SEARCH_RESULT_CARDS = 8;

export default function SearchLoading() {
  return (
    <SkeletonScreen
      label="Loading search"
      className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 md:px-6 md:pb-16 md:pt-10 lg:px-8"
    >
      <div className="max-w-2xl space-y-3">
        <Skeleton shape="text" className="h-3 w-16" />
        <Skeleton shape="text" className="h-9 w-2/3 md:h-12 md:w-1/2" />
        <Skeleton shape="text" className="h-3 w-3/4 md:w-1/2" />
      </div>
      <div className="cv-auto-lg mt-8 min-h-[60vh]">
        <ProductGridSkeleton
          count={SEARCH_RESULT_CARDS}
          className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4"
        />
      </div>
    </SkeletonScreen>
  );
}
