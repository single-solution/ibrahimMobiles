import { AdminShell } from "@/components/AdminShell";
import { Categories } from "@/components/categories/Categories";
import { PageTitle } from "@/components/PageTitle";

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
    <AdminShell>
      <PageTitle
        eyebrow="Catalog"
        title="Categories"
        description="Brands, grades, and attributes per category — author once, surface everywhere."
      />
      <section className="mt-8">
        <Categories
          initialCategories={categoryDocs.map(toCategoryResponse)}
          initialBrands={brandDocs.map(toBrandResponse)}
          initialGrades={gradeDocs.map(toGradeResponse)}
          initialAttributes={attributeDocs.map(toAttributeResponse)}
        />
      </section>
    </AdminShell>
  );
}
