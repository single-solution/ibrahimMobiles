import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { orderPaymentToCheckoutId } from "@store/shared";

import { CheckoutSuccess } from "@/app/checkout/_components/CheckoutSuccess";
import { auth } from "@/lib/auth";
import { getAccountOrder } from "@/lib/storefront/account";

export const metadata: Metadata = {
  title: "Order placed",
  description: "Your order is confirmed and on its way.",
};

export const dynamic = "force-dynamic";

interface CheckoutSuccessPageProps {
  searchParams: Promise<{
    order?: string | string[];
  }>;
}

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "customer" || !session.user.customerId) {
    const params = await searchParams;
    const orderParam = typeof params.order === "string" ? params.order : "";
    const next = orderParam
      ? `/checkout/success?order=${encodeURIComponent(orderParam)}`
      : "/checkout/success";
    redirect(`/account/sign-in?next=${encodeURIComponent(next)}`);
  }

  const params = await searchParams;
  const orderNumber = typeof params.order === "string" ? params.order.trim() : "";
  if (!orderNumber) {
    redirect("/account/orders");
  }

  const order = await getAccountOrder(session.user.customerId, orderNumber);
  if (!order) {
    redirect("/account/orders");
  }

  return (
    <CheckoutSuccess
      orderNumber={order.orderNumber}
      payment={orderPaymentToCheckoutId(order.payment)}
      totalRupees={order.totals.totalRupees}
      pointsEarned={order.pointsEarned}
      pointsRedeemed={order.pointsRedeemed}
    />
  );
}
