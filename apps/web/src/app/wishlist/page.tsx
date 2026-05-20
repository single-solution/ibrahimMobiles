import type { Metadata } from "next";
import { Wishlist } from "@/components/wishlist/Wishlist";

export const metadata: Metadata = {
  title: "Saved phones",
  description: "Phones you've saved for later.",
};

export default function WishlistPage() {
  return <Wishlist />;
}
