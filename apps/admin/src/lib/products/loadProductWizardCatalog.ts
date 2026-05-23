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
import type {
  AdminAttribute,
  AdminBrand,
  AdminCategory,
  AdminGrade,
} from "@/types/admin";

export interface ProductWizardCatalog {
  categories: AdminCategory[];
  brandsByCategory: Record<string, AdminBrand[]>;
  gradesByCategory: Record<string, AdminGrade[]>;
  attributesByCategory: Record<string, AdminAttribute[]>;
}

export async function loadProductWizardCatalog(): Promise<ProductWizardCatalog> {
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

  return {
    categories,
    brandsByCategory,
    gradesByCategory,
    attributesByCategory,
  };
}
