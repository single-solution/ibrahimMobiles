import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Confirm your contact, address and payment to place your order.",
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
