import type { Metadata } from "next";

import { DECIMAL_RADIX } from "@store/shared";

import { CheckoutSuccessView } from "@/components/checkout/CheckoutSuccessView";

export const metadata: Metadata = {
  title: "Order placed",
  description: "Your order is confirmed and on its way.",
};

interface CheckoutSuccessPageProps {
  searchParams: Promise<{
    order?: string | string[];
    earned?: string | string[];
    redeemed?: string | string[];
  }>;
}

function readNumberParam(value: string | string[] | undefined): number {
  if (!value || Array.isArray(value)) {
    return 0;
  }
  const parsed = Number.parseInt(value, DECIMAL_RADIX);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** Render-time fallback shown when this page is opened without an order
 *  param (typically a direct refresh after the redirect). The year tracks
 *  the current calendar year so the placeholder never reads as stale. */
function buildPlaceholderOrderNumber(): string {
  return `IM-${new Date().getFullYear()}-0000`;
}

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const orderNumber =
    typeof params.order === "string" ? params.order : buildPlaceholderOrderNumber();
  const pointsEarned = readNumberParam(params.earned);
  const pointsRedeemed = readNumberParam(params.redeemed);
  return (
    <CheckoutSuccessView
      orderNumber={orderNumber}
      pointsEarned={pointsEarned}
      pointsRedeemed={pointsRedeemed}
    />
  );
}
