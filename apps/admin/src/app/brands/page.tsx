import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { BrandsTable } from "@/components/BrandsTable";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import { Brand, connectDB } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { toBrandResponse, type BrandLean } from "@/lib/serializers/brand";

export const dynamic = "force-dynamic";

const BRANDS_COLUMN_COUNT = 5;
const BRANDS_ROW_COUNT = 10;

export default async function AdminBrandsPage() {
  await requirePageSession("/brands");

  return (
    <AdminShell>
      <PageTitle eyebrow="Catalog" title="Brands" />
      <section className="mt-8">
        <Suspense
          fallback={
            <AdminTableSkeleton
              columnCount={BRANDS_COLUMN_COUNT}
              rowCount={BRANDS_ROW_COUNT}
            />
          }
        >
          <BrandsData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function BrandsData() {
  await connectDB();
  const docs = await Brand.find().sort({ sortOrder: 1, name: 1 }).lean<BrandLean[]>();
  const brands = docs.map(toBrandResponse);
  return <BrandsTable brands={brands} />;
}
