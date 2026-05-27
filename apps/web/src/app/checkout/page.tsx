import type { Metadata } from "next";
import { Checkout } from "@/app/checkout/_components/Checkout";
import { auth } from "@/lib/auth";
import { getAccountCustomer } from "@/lib/storefront/account";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Confirm your contact, address and payment to place your order.",
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  const customer =
    session?.user?.role === "customer" && session.user.customerId
      ? await getAccountCustomer(session.user.customerId)
      : null;

  return <Checkout key={customer?.id ?? "guest"} customer={customer} />;
}
