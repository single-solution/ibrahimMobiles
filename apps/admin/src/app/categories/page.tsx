import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { CategoriesView } from "@/components/CategoriesView";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import { Category, connectDB, Grade } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { toCategoryResponse, type CategoryLean } from "@/lib/serializers/category";
import { toGradeResponse, type GradeLean } from "@/lib/serializers/grade";

export const dynamic = "force-dynamic";

const CATEGORIES_COLUMN_COUNT = 4;
const CATEGORIES_ROW_COUNT = 6;

export default async function AdminCategoriesPage() {
  await requirePageSession("/categories");

  return (
    <AdminShell>
      <PageTitle
        eyebrow="Catalog"
        title="Categories"
        description="The three shop types and the condition grades that gate filtering."
      />
      <section className="mt-8">
        <Suspense
          fallback={
            <div className="space-y-6">
              <AdminTableSkeleton
                columnCount={CATEGORIES_COLUMN_COUNT}
                rowCount={CATEGORIES_ROW_COUNT}
                hasFilterBar={false}
              />
              <AdminTableSkeleton
                columnCount={CATEGORIES_COLUMN_COUNT}
                rowCount={CATEGORIES_ROW_COUNT}
                hasFilterBar={false}
              />
            </div>
          }
        >
          <CategoriesData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function CategoriesData() {
  await connectDB();
  const [categoryDocs, gradeDocs] = await Promise.all([
    Category.find().sort({ sortOrder: 1 }).lean<CategoryLean[]>(),
    Grade.find().sort({ sortOrder: 1 }).lean<GradeLean[]>(),
  ]);
  const categories = categoryDocs.map(toCategoryResponse);
  const grades = gradeDocs.map(toGradeResponse);
  return <CategoriesView categories={categories} grades={grades} />;
}
