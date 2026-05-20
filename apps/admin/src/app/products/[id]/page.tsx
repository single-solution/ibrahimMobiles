import { notFound } from "next/navigation";

import { AdminShell } from "@/components/AdminShell";
import { ProductEditor } from "@/components/products/ProductEditor";

import {
  Attribute,
  Brand,
  Category,
  connectDB,
  Grade,
  Product,
} from "@store/db";
import { isValidId } from "@store/shared";

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
import {
  toProductResponse,
  type ProductLean,
} from "@/lib/serializers/product";
import { requirePageSession } from "@/lib/server/requirePageSession";

interface ProductEditPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ProductEditPage({ params }: ProductEditPageProps) {
  const { id } = await params;
  await requirePageSession(`/products/${id}`);

  if (!isValidId(id)) {
    notFound();
  }

  await connectDB();
  const productDoc = await Product.findById(id).lean<ProductLean>();
  if (!productDoc) {
    notFound();
  }

  const [brandDoc, categoryDoc, gradesDocs, attributesDocs, categoryBrandsDocs] =
    await Promise.all([
      Brand.findOne({ slug: productDoc.brandSlug }).lean<BrandLean>(),
      Category.findOne({ slug: productDoc.categorySlug }).lean<CategoryLean>(),
      Grade.find({ categorySlug: productDoc.categorySlug })
        .sort({ label: 1 })
        .lean<GradeLean[]>(),
      Attribute.find({ categorySlug: productDoc.categorySlug })
        .sort({ label: 1 })
        .lean<AttributeLean[]>(),
      Brand.find({ categorySlugs: productDoc.categorySlug, isActive: true })
        .sort({ name: 1 })
        .lean<BrandLean[]>(),
    ]);

  const product = toProductResponse(productDoc, brandDoc ?? undefined);
  const category = categoryDoc ? toCategoryResponse(categoryDoc) : null;
  const brands = categoryBrandsDocs.map(toBrandResponse);
  const grades = gradesDocs.map(toGradeResponse);
  const attributes = attributesDocs.map(toAttributeResponse);

  return (
    <AdminShell>
      <ProductEditor
        product={product}
        category={category}
        brands={brands}
        grades={grades}
        attributes={attributes}
      />
    </AdminShell>
  );
}
