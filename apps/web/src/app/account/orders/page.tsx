import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStoreSettings } from "@store/db";
import { OrdersListView } from "@/components/account/OrdersListView";
import { auth } from "@/lib/auth";
import { getAccountOrders } from "@/lib/storefront/account";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getStoreSettings();
  return {
    title: "Your orders",
    description: `Every order you've placed with ${siteName}.`,
  };
}

export const dynamic = "force-dynamic";

export default async function OrdersListPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "customer" || !session.user.customerId) {
    redirect("/account/sign-in?next=/account/orders");
  }
  const orders = await getAccountOrders(session.user.customerId);
  return <OrdersListView orders={orders} />;
}
