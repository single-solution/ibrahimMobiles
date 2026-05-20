import type { Metadata } from "next";
import { Checkout } from "@/components/checkout/Checkout";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Confirm your contact, address and payment to place your order.",
};

export default function CheckoutPage() {
  return <Checkout />;
}
