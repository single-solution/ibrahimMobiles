import type { StockType, StockTypeDescriptor } from "@/types";

export const stockTypeDescriptors: StockTypeDescriptor[] = [
  {
    stockType: "brand-new",
    label: "Brand New",
    shortLabel: "Brand new",
    description:
      "Factory-sealed, unopened. Full international warranty where applicable. Highest stock category we carry.",
    tone: "dark",
  },
  {
    stockType: "genuine",
    label: "Genuine",
    shortLabel: "Genuine",
    description:
      "Authentic, original-spec device imported through legitimate channels. Most reliable used-stock category.",
    tone: "accent",
  },
  {
    stockType: "box-open",
    label: "Box Open",
    shortLabel: "Box-open",
    description:
      "Sealed box opened for inspection or display only — never used. Comes with original accessories.",
    tone: "info",
  },
  {
    stockType: "refurbished",
    label: "Refurbished",
    shortLabel: "Refurbished",
    description:
      "Professionally repaired or restored — battery and key parts replaced. Not factory-original throughout.",
    tone: "neutral",
  },
  {
    stockType: "china-water",
    label: "China Water Pack",
    shortLabel: "China-pack",
    description:
      "Chinese-region stock, often parallel-imported. Usually cheaper but mixed reliability — checked thoroughly before listing.",
    tone: "warn",
  },
  {
    stockType: "lcd-shaded",
    label: "LCD Shaded",
    shortLabel: "LCD shaded",
    description:
      "Functional unit with visible screen tint, shadow or burn-in. Heavily discounted — best for budget buyers who don't mind a marked display.",
    tone: "danger",
  },
];

const BY_TYPE: Record<StockType, StockTypeDescriptor> = stockTypeDescriptors.reduce(
  (acc, descriptor) => {
    acc[descriptor.stockType] = descriptor;
    return acc;
  },
  {} as Record<StockType, StockTypeDescriptor>,
);

export function getStockTypeDescriptor(stockType: StockType): StockTypeDescriptor {
  return BY_TYPE[stockType];
}
