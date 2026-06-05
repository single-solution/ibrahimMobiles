/**
 * Tools the chat assistant may call to fetch live information on demand.
 *
 * Security model: the model can only influence PUBLIC inputs (a catalog search
 * query). Order/account tools ignore anything the model passes and read solely
 * the session-verified `customerId` from the tool context — so the bot can
 * never reach another person's data, and escalation is the safe exit for
 * anything restricted.
 */

import {
  formatPrice,
  formatWarrantyPeriod,
  resolveWarrantyDays,
  slugify,
  type AssistantToolCall,
  type AssistantToolSchema,
  type Product,
} from "@store/shared";

import { productHref } from "@/lib/catalog/productPaths";
import {
  buildOrderContext,
  formatCatalogLine,
  formatDeals,
} from "@/lib/chat/assistant/storeContext";
import { getAccountChatProfile, type AccountChatProfile } from "@/lib/core/account";
import {
  getOffersCached,
  getPopularProductsCached,
  getProductBySlugCached,
  getProductsPageCached,
  searchAssistantCatalogCached,
} from "@/lib/core/cached";
import { isProductInStock } from "@/lib/productSummary";

export interface AssistantToolContext {
  /** Session-verified customer id — NEVER derived from model/user input. */
  verifiedCustomerId?: string;
  /** Mutated when the model asks to bring in a human. */
  escalation: { requested: boolean; reason?: string };
}

export const ASSISTANT_TOOL_SCHEMAS: AssistantToolSchema[] = [
  {
    name: "search_catalog",
    description:
      "Search the live store catalog, ranked by relevance. Give a free-text `query` (name/brand/model like 'iphone 13 pro' or 'samsung') and/or filters. Use the filters to browse by budget or condition — e.g. category 'smartphones' with max_price 150000 for 'phones under 150k'. Returns matching products with per-grade prices, stock, and links. Use this for any product, price, or availability question.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Free-text product search, e.g. 'iphone 13 pro' or 'samsung'.",
        },
        category: {
          type: "string",
          description:
            "Narrow to one of the store's categories, e.g. 'smartphones', 'smartwatches'.",
        },
        grade: {
          type: "string",
          description: "Require a condition grade, e.g. 'brand-new', 'good-condition'.",
        },
        min_price: { type: "number", description: "Minimum price in Rs." },
        max_price: { type: "number", description: "Maximum price in Rs (the customer's budget)." },
        in_stock_only: {
          type: "boolean",
          description: "Set true to return only items currently in stock.",
        },
      },
    },
  },
  {
    name: "get_product_details",
    description:
      "Get full details for ONE specific product — every condition grade with its price, stock, warranty, and key specs (storage, colour, etc.). Use when the customer asks about specs, warranty, options, or exact prices for a product you already found.",
    parameters: {
      type: "object",
      properties: {
        product: {
          type: "string",
          description: "The product name, slug, or link from a previous search result.",
        },
      },
      required: ["product"],
    },
  },
  {
    name: "list_active_deals",
    description:
      "List the store's currently active promotions and discounts. Use when the customer asks about deals/offers or when a relevant saving is worth mentioning.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_top_products",
    description:
      "List the store's best-selling/popular products, or the newest arrivals. Use when the customer asks what's popular, best-selling, trending, most bought, recommended, or what's new/latest. Returns public product summaries (name, per-grade price, stock, link).",
    parameters: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          description:
            "'popular' for best-sellers (default), or 'new' for the newest arrivals.",
        },
      },
    },
  },
  {
    name: "get_my_orders",
    description:
      "Look up the SIGNED-IN customer's own order history (status, items, totals, delivery). Use only for questions about their orders. Returns a notice if they are not signed in.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_my_account",
    description:
      "Get the SIGNED-IN customer's own profile: name, loyalty points balance, and saved delivery addresses. Use to greet them by name or answer questions about their points/addresses. Returns a notice if they are not signed in.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "escalate_to_human",
    description:
      "Hand the conversation to a senior human teammate. Call this when the customer asks for a human/manager, is upset or complaining, or requests something you cannot share or do (another person's order, business figures, refunds/approvals, anything outside store support). After calling, warmly tell the customer a senior teammate is joining this chat.",
    parameters: {
      type: "object",
      properties: { reason: { type: "string", description: "Short reason for escalation." } },
      required: ["reason"],
    },
  },
];

function stringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === "string" ? value : "";
}

function numberArg(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

function formatVariantLine(variant: Product["variants"][number]): string {
  const parts = [
    variant.gradeSlug || "standard",
    formatPrice(variant.priceRupees),
    variant.quantity > 0 ? `${variant.quantity} in stock` : "out of stock",
  ];
  const warrantyDays = resolveWarrantyDays(variant);
  if (warrantyDays > 0) {
    parts.push(`${formatWarrantyPeriod(warrantyDays)} warranty`);
  }
  const specs = Object.values(variant.attributeDisplay ?? {})
    .filter(Boolean)
    .join(", ");
  if (specs) {
    parts.push(specs);
  }
  return `  - ${parts.join(" | ")}`;
}

function formatProductDetails(product: Product): string {
  const header = `${product.brandName} ${product.name}`.trim();
  const lines = [
    header,
    `${product.variants.length} option(s) by condition:`,
    ...product.variants.map(formatVariantLine),
    `Status: ${isProductInStock(product) ? "available" : "out of stock"}`,
    `link: ${productHref(product)}`,
  ];
  return lines.join("\n");
}

function formatAccountProfile(profile: AccountChatProfile): string {
  const lines = [`Name: ${profile.name}`];
  if (profile.city) {
    lines.push(`City: ${profile.city}`);
  }
  lines.push(
    profile.loyaltyBalance !== null
      ? `Loyalty points balance: ${profile.loyaltyBalance}`
      : "Loyalty: not enrolled yet",
  );
  if (profile.addresses.length > 0) {
    const addresses = profile.addresses
      .map((address) => {
        const parts = [address.recipientName, address.street, address.area, address.city]
          .filter(Boolean)
          .join(", ");
        return `- ${parts}${address.isDefault ? " (default)" : ""}`;
      })
      .join("\n");
    lines.push(`Saved delivery addresses:\n${addresses}`);
  } else {
    lines.push("No saved delivery addresses.");
  }
  return lines.join("\n");
}

export async function executeAssistantTool(
  call: AssistantToolCall,
  context: AssistantToolContext,
): Promise<string> {
  if (call.name === "search_catalog") {
    const query = stringArg(call.arguments, "query").trim().slice(0, 80);
    const category = stringArg(call.arguments, "category").trim();
    const grade = stringArg(call.arguments, "grade").trim();
    const minPrice = numberArg(call.arguments, "min_price");
    const maxPrice = numberArg(call.arguments, "max_price");
    if (!query && !category && grade === "" && minPrice === undefined && maxPrice === undefined) {
      return "No search query or filter was provided.";
    }
    const products = await searchAssistantCatalogCached({
      search: query || undefined,
      categorySlug: category ? slugify(category, 64) : undefined,
      gradeSlugs: grade ? [slugify(grade, 64)] : undefined,
      minPriceRupees: minPrice,
      maxPriceRupees: maxPrice,
      inStockOnly: call.arguments.in_stock_only === true,
    });
    if (products.length === 0) {
      return `Nothing in the catalog matched that. Do not invent any — offer to double-check with the team or suggest a related category.`;
    }
    return products.map(formatCatalogLine).join("\n");
  }

  if (call.name === "get_product_details") {
    const reference = stringArg(call.arguments, "product").trim();
    if (!reference) {
      return "No product was specified.";
    }
    const slugGuess = reference.split("?")[0].split("/").filter(Boolean).pop()?.toLowerCase() ?? "";
    let product = slugGuess ? await getProductBySlugCached(slugGuess) : null;
    if (!product) {
      const matches = await searchAssistantCatalogCached({
        search: reference.slice(0, 80),
        limit: 1,
      });
      product = matches[0] ?? null;
    }
    return product
      ? formatProductDetails(product)
      : `No catalog product matched "${reference}". Don't invent specs — offer to look it up with the team.`;
  }

  if (call.name === "list_active_deals") {
    const offers = await getOffersCached();
    return formatDeals(offers) ?? "No active promotions are running right now.";
  }

  if (call.name === "get_top_products") {
    const kind = stringArg(call.arguments, "kind").trim().toLowerCase();
    const products =
      kind === "new"
        ? (await getProductsPageCached({ sort: "newest" })).products
        : await getPopularProductsCached();
    if (products.length === 0) {
      return "Nothing to show there yet. Don't invent any — suggest browsing a category or checking with the team.";
    }
    return products.map(formatCatalogLine).join("\n");
  }

  if (call.name === "get_my_orders") {
    if (!context.verifiedCustomerId) {
      return "The customer is not signed in, so their orders can't be accessed. Invite them to sign in to their account and offer to pull the order up there.";
    }
    const orders = await buildOrderContext(context.verifiedCustomerId);
    return orders ?? "No orders are on this signed-in account yet.";
  }

  if (call.name === "get_my_account") {
    if (!context.verifiedCustomerId) {
      return "The customer is not signed in, so account details can't be accessed. Invite them to sign in.";
    }
    const profile = await getAccountChatProfile(context.verifiedCustomerId);
    return profile ? formatAccountProfile(profile) : "No account profile was found.";
  }

  if (call.name === "escalate_to_human") {
    context.escalation.requested = true;
    context.escalation.reason = stringArg(call.arguments, "reason").slice(0, 200) || undefined;
    return "A senior teammate has been alerted and will join this chat. Let the customer know warmly that a colleague is stepping in to help.";
  }

  return "That action isn't available.";
}
