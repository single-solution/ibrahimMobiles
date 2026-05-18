import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

const MEDIA_GRID_COUNT = 18;

/**
 * Media library is a 4–6 column grid of square image tiles, each with a
 * 1-line filename caption below. Skeleton mirrors that grid so the real
 * thumbnails land in the exact same cells.
 */
export default function MediaLoading() {
  return (
    <AdminPageSkeleton
      label="Loading media library"
      eyebrowWidthClass="w-10"
      titleWidthClass="w-40"
      hasDescription
      hasActions
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: MEDIA_GRID_COUNT }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="aspect-square w-full" />
            <Skeleton shape="text" className="h-3 w-3/4" />
            <Skeleton shape="text" className="h-2.5 w-1/2" />
          </div>
        ))}
      </div>
    </AdminPageSkeleton>
  );
}
