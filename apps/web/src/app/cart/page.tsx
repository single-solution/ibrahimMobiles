import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review the items in your cart before heading to checkout.",
};

export default function CartPage() {
  return <CartView />;
}
