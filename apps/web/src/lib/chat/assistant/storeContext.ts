import { formatPrice, type AssistantStoreContext, type Product } from "@store/shared";

import { productHref } from "@/lib/catalog/productPaths";
import { getProductPriceRange, isProductInStock } from "@/lib/productSummary";
import { getProductById } from "@/lib/core/queries";
import {
  getCategoriesCached,
  getProductsPageCached,
  getStoreSettingsCached,
} from "@/lib/core/cached";

function formatCatalogLine(product: Product): string {
  const inStock = isProductInStock(product);
  const price = getProductPriceRange(product);
  const grades = [
    ...new Set(product.variants.map((variant) => variant.gradeSlug)),
  ].slice(0, 4);
  const path = productHref(product);
  return [
    `- ${product.brandName} ${product.name}`,
    price ? `from ${price}` : "price on request",
    inStock ? "in stock" : "out of stock",
    grades.length ? `grades: ${grades.join(", ")}` : null,
    `link: ${path}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

async function loadSubjectProduct(
  subjectProductId?: string,
): Promise<Product | null> {
  if (!subjectProductId) {
    return null;
  }
  return getProductById(subjectProductId);
}

export async function buildAssistantStoreContext(input: {
  customerMessage: string;
  subjectProductId?: string;
  subjectProductName?: string;
}): Promise<AssistantStoreContext> {
  const [settings, categories, searchPage, subjectProduct] = await Promise.all([
    getStoreSettingsCached(),
    getCategoriesCached(),
    getProductsPageCached({
      search: input.customerMessage.trim().slice(0, 80),
      limit: 100,
      sort: "newest",
    }),
    loadSubjectProduct(input.subjectProductId),
  ]);

  const activeCategories = categories
    .filter((category) => category.isActive)
    .map((category) => category.label)
    .join(", ");

  const catalogLines = new Map<string, string>();
  if (subjectProduct) {
    catalogLines.set(subjectProduct.id, formatCatalogLine(subjectProduct));
  }
  for (const product of searchPage.products) {
    if (!catalogLines.has(product.id)) {
      catalogLines.set(product.id, formatCatalogLine(product));
    }
  }

  const policies = [
    `Warranty: ${settings.defaultWarrantyMonths} months on eligible items.`,
    `Money-back window: ${settings.moneybackDays} days (store policy).`,
    `Free delivery above ${formatPrice(settings.freeDeliveryThresholdRupees)}.`,
    `Bank transfer pre-pay discount: ${settings.bankTransferDiscountPercent}% when applicable.`,
    `Loyalty: earn ${settings.loyaltyEarnPercent}% back on orders.`,
    "Payment options: bank transfer, Easypaisa, JazzCash, COD (see checkout).",
  ].join(" ");

  let subjectProductBlock: string | undefined;
  if (subjectProduct) {
    subjectProductBlock = formatCatalogLine(subjectProduct);
  } else if (input.subjectProductName) {
    subjectProductBlock = `Customer opened chat about "${input.subjectProductName}" (unverified snapshot — confirm live stock on site).`;
  }

  return {
    siteName: settings.siteName,
    siteTagline: settings.siteTagline,
    supportPhone: settings.supportPhone,
    supportEmail: settings.supportEmail,
    storeAddress: `${settings.storeAddressLine1}, ${settings.storeAddressLine2}`.trim(),
    storeHours: settings.storeHours,
    policies,
    categories: activeCategories || "See /shop",
    catalog:
      catalogLines.size > 0
        ? [...catalogLines.values()].join("\n")
        : "No matching products in catalog for this query — do not invent models or prices.",
    subjectProduct: subjectProductBlock,
  };
}
