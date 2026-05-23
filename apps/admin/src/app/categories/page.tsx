import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { CategoriesCatalog } from "@/components/categories/CategoriesCatalog";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import {
  Attribute,
  Brand,
  Category,
  connectDB,
  Grade,
} from "@store/db";
import {
  toAttributeResponse,
  type AttributeLean,
} from "@/lib/serializers/attribute";
import { toBrandResponse, type BrandLean } from "@/lib/serializers/brand";
import {
  toCategoryResponse,
  type CategoryLean,
} from "@/lib/serializers/category";
import { toGradeResponse, type GradeLean } from "@/lib/serializers/grade";
import { requirePageSession } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

const TABLE_COLUMN_COUNT = 4;
const TABLE_ROW_COUNT = 10;

export default async function AdminCategoriesPage() {
  await requirePageSession("/categories");
  await connectDB();

  const [categoryDocs, brandDocs, gradeDocs, attributeDocs] = await Promise.all([
    Category.find().sort({ sortOrder: 1, label: 1 }).lean<CategoryLean[]>(),
    Brand.find().sort({ name: 1 }).lean<BrandLean[]>(),
    Grade.find().sort({ categorySlug: 1, label: 1 }).lean<GradeLean[]>(),
    Attribute.find().sort({ categorySlug: 1, label: 1 }).lean<AttributeLean[]>(),
  ]);

  return (
    <AdminShell contentClassName="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5 md:p-2">
      <section className="flex min-h-0 flex-1 flex-col">
        <Suspense
          fallback={
            <AdminTableSkeleton
              columnCount={TABLE_COLUMN_COUNT}
              rowCount={TABLE_ROW_COUNT}
            />
          }
        >
          <CategoriesCatalog
            initialCategories={categoryDocs.map(toCategoryResponse)}
            initialBrands={brandDocs.map(toBrandResponse)}
            initialGrades={gradeDocs.map(toGradeResponse)}
            initialAttributes={attributeDocs.map(toAttributeResponse)}
          />
        </Suspense>
      </section>
    </AdminShell>
  );
}
