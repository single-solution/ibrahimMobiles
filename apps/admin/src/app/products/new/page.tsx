import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { CreateProduct } from "@/components/products/CreateProduct";

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
import type {
  AdminAttribute,
  AdminBrand,
  AdminGrade,
} from "@/types/admin";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requirePageSession("/products/new");
  await connectDB();

  const [categoryDocs, brandDocs, gradeDocs, attributeDocs] = await Promise.all([
    Category.find({ isActive: true })
      .sort({ sortOrder: 1, label: 1 })
      .lean<CategoryLean[]>(),
    Brand.find({ isActive: true }).sort({ name: 1 }).lean<BrandLean[]>(),
    Grade.find().sort({ categorySlug: 1, label: 1 }).lean<GradeLean[]>(),
    Attribute.find({ isActive: true })
      .sort({ categorySlug: 1, label: 1 })
      .lean<AttributeLean[]>(),
  ]);

  const categories = categoryDocs.map(toCategoryResponse);
  const brands = brandDocs.map(toBrandResponse);
  const grades = gradeDocs.map(toGradeResponse);
  const attributes = attributeDocs.map(toAttributeResponse);

  const brandsByCategory: Record<string, AdminBrand[]> = {};
  for (const brand of brands) {
    for (const slug of brand.categorySlugs) {
      const bucket = brandsByCategory[slug] ?? [];
      bucket.push(brand);
      brandsByCategory[slug] = bucket;
    }
  }
  const gradesByCategory: Record<string, AdminGrade[]> = {};
  for (const grade of grades) {
    const bucket = gradesByCategory[grade.categorySlug] ?? [];
    bucket.push(grade);
    gradesByCategory[grade.categorySlug] = bucket;
  }
  const attributesByCategory: Record<string, AdminAttribute[]> = {};
  for (const attribute of attributes) {
    const bucket = attributesByCategory[attribute.categorySlug] ?? [];
    bucket.push(attribute);
    attributesByCategory[attribute.categorySlug] = bucket;
  }

  return (
    <AdminShell>
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink-500)] transition-colors hover:text-[var(--color-ink-900)]"
      >
        <ChevronLeft size={12} />
        Back to products
      </Link>

      <div className="mt-4">
        <PageTitle
          eyebrow="New product"
          title="Add a product"
          description="Pick a category to surface its brands, grades, and attributes. Variants carry images, price, and stock."
        />
      </div>

      <section className="mt-6">
        <CreateProduct
          categories={categories}
          brandsByCategory={brandsByCategory}
          gradesByCategory={gradesByCategory}
          attributesByCategory={attributesByCategory}
        />
      </section>
    </AdminShell>
  );
}
