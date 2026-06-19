/**
 * Minimal store context for admin assistant testing — same shape as
 * production, built from DB without storefront serializers.
 */

import { formatPrice } from "@store/shared";
import type { AssistantStoreContext } from "@store/shared";

import {
  Category,
  Product,
  connectDB,
  getStoreSettings,
} from "@store/db";

interface ProductLean {
  _id: { toString(): string };
  name: string;
  slug: string;
  categorySlug: string;
  brandSlug: string;
  isActive: boolean;
  isArchived?: boolean;
  variants?: Array<{ gradeSlug: string; priceRupees: number; stock: number }>;
}

function formatProductLine(product: ProductLean, brandName: string): string {
  const variants = product.variants ?? [];
  const prices = variants.map((variant) => variant.priceRupees).filter((p) => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const inStock = variants.some((variant) => variant.stock > 0);
  const grades = [...new Set(variants.map((variant) => variant.gradeSlug))].slice(0, 4);
  return [
    `- ${brandName} ${product.name}`,
    minPrice ? `from ${formatPrice(minPrice)}` : "price on request",
    inStock ? "in stock" : "out of stock",
    grades.length ? `grades: ${grades.join(", ")}` : null,
    `link: /${product.categorySlug}/${product.slug}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

export async function buildAssistantTestContext(input: {
  customerMessage: string;
  subjectProductId?: string;
}): Promise<AssistantStoreContext> {
  await connectDB();
  const settings = await getStoreSettings();

  const [categories, searchProducts, subjectProduct] = await Promise.all([
    Category.find({ isActive: true }).select("label").sort({ sortOrder: 1 }).lean<
      Array<{ label: string }>
    >(),
    Product.find({
      isActive: true,
      isArchived: { $ne: true },
      name: { $regex: input.customerMessage.trim().slice(0, 60), $options: "i" },
    })
      .select("name slug categorySlug brandSlug variants")
      .limit(100)
      .lean<ProductLean[]>(),
    input.subjectProductId
      ? Product.findOne({
          _id: input.subjectProductId,
          isActive: true,
          isArchived: { $ne: true },
        })
          .select("name slug categorySlug brandSlug variants")
          .lean<ProductLean>()
      : Promise.resolve(null),
  ]);

  const brandNames = new Map<string, string>();
  for (const product of [...searchProducts, subjectProduct].filter(Boolean) as ProductLean[]) {
    brandNames.set(product.brandSlug, product.brandSlug.replace(/-/g, " "));
  }

  const catalogLines = new Map<string, string>();
  if (subjectProduct) {
    catalogLines.set(
      subjectProduct._id.toString(),
      formatProductLine(subjectProduct, brandNames.get(subjectProduct.brandSlug) ?? subjectProduct.brandSlug),
    );
  }
  for (const product of searchProducts) {
    const id = product._id.toString();
    if (!catalogLines.has(id)) {
      catalogLines.set(
        id,
        formatProductLine(product, brandNames.get(product.brandSlug) ?? product.brandSlug),
      );
    }
  }

  const policies = [
    `Warranty: ${settings.defaultWarrantyMonths} months on eligible items.`,
    `Money-back window: ${settings.moneybackDays} days.`,
    `Free delivery above ${formatPrice(settings.freeDeliveryThresholdRupees)}.`,
    `Bank transfer pre-pay discount: ${settings.bankTransferDiscountPercent}% when applicable.`,
    `Loyalty: earn ${settings.loyaltyEarnPercent}% back on orders.`,
    "Payment: bank transfer, Easypaisa, JazzCash, COD (checkout).",
  ].join(" ");

  return {
    siteName: settings.siteName,
    siteTagline: settings.siteTagline,
    supportPhone: settings.supportPhone,
    supportEmail: settings.supportEmail,
    storeAddress: `${settings.storeAddressLine1}, ${settings.storeAddressLine2}`.trim(),
    storeHours: settings.storeHours,
    policies,
    categories: categories.map((category) => category.label).join(", ") || "See /",
    catalog:
      catalogLines.size > 0
        ? [...catalogLines.values()].join("\n")
        : "No matching products — do not invent models or prices.",
    subjectProduct: subjectProduct
      ? formatProductLine(
          subjectProduct,
          brandNames.get(subjectProduct.brandSlug) ?? subjectProduct.brandSlug,
        )
      : undefined,
  };
}
