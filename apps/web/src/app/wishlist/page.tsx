import type { Metadata } from "next";
import { WishlistView } from "@/components/wishlist/WishlistView";

export const metadata: Metadata = {
  title: "Saved phones",
  description: "Phones you've saved for later.",
};

export default function WishlistPage() {
  return <WishlistView />;
}
