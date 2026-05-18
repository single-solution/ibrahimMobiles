import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { MediaLibraryView } from "@/components/MediaLibraryView";
import { Skeleton } from "@/components/ui/Skeleton";
import { connectDB, MediaAsset } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { toMediaAssetResponse, type MediaAssetLean } from "@/lib/serializers/mediaAsset";

export const dynamic = "force-dynamic";

const MEDIA_LIBRARY_LIMIT = 500;
const MEDIA_GRID_FALLBACK_COUNT = 18;

export default async function AdminMediaPage() {
  await requirePageSession("/media");

  return (
    <AdminShell>
      <PageTitle
        eyebrow="Site"
        title="Media library"
        description="Image assets used in product photography, banners, and promotions."
      />
      <section className="mt-8">
        <Suspense fallback={<MediaFallback />}>
          <MediaData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function MediaData() {
  await connectDB();
  const docs = await MediaAsset.find()
    .sort({ createdAt: -1 })
    .limit(MEDIA_LIBRARY_LIMIT)
    .lean<MediaAssetLean[]>();
  const assets = docs.map(toMediaAssetResponse);
  return <MediaLibraryView assets={assets} />;
}

function MediaFallback() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: MEDIA_GRID_FALLBACK_COUNT }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="aspect-square w-full" />
          <Skeleton shape="text" className="h-3 w-3/4" />
          <Skeleton shape="text" className="h-2.5 w-1/2" />
        </div>
      ))}
    </div>
  );
}
