import { Pill } from "@/components/ui/Pill";
import { getStockTypeDescriptor } from "@/data/stockTypes";
import type { StockType } from "@/types";

interface StockTypeBadgeProps {
  stockType: StockType;
  size?: "sm" | "md";
  className?: string;
}

export function StockTypeBadge({ stockType, size = "sm", className }: StockTypeBadgeProps) {
  const descriptor = getStockTypeDescriptor(stockType);
  return (
    <Pill tone={descriptor.tone} size={size} className={className}>
      {descriptor.label}
    </Pill>
  );
}
