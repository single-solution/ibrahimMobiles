"use client";

import { useSyncExternalStore } from "react";
import {
  clearWishlist,
  getWishlistServerSnapshot,
  getWishlistSnapshot,
  isInWishlist,
  removeWishlistItem,
  subscribeToWishlist,
  toggleWishlistItem,
} from "@/lib/wishlist/store";
import type { WishlistItem } from "@/lib/wishlist/types";

interface UseWishlist {
  items: WishlistItem[];
  itemCount: number;
  has: (productId: string) => boolean;
  toggle: (item: Omit<WishlistItem, "savedAt">) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

/**
 * React hook that mirrors `useCart` but for wishlist items. Works at module
 * level — no provider required.
 */
export function useWishlist(): UseWishlist {
  const state = useSyncExternalStore(
    subscribeToWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot,
  );

  return {
    items: state.items,
    itemCount: state.items.length,
    has: isInWishlist,
    toggle: (item) => {
      toggleWishlistItem(item);
    },
    remove: removeWishlistItem,
    clear: clearWishlist,
  };
}
