"use client";

/**
 * Browser-local wishlist. Mirrors the cart store pattern:
 *   - persisted to localStorage
 *   - reactive via `useSyncExternalStore`
 *   - cross-tab synced via the `storage` event
 *
 * Anonymous customers are first-class — wishlists never require an account
 * and are intentionally device-local: signing in does not sync saves to the
 * server, so the same browser session always sees the same list.
 */

import type { WishlistItem } from "@/lib/wishlist/types";

const STORAGE_KEY = "storefront:wishlist:v1";
const MAX_ITEMS = 50;

type Listener = () => void;

interface WishlistState {
  items: WishlistItem[];
}

const EMPTY_STATE: WishlistState = { items: [] };

let cachedState: WishlistState = EMPTY_STATE;
let isHydrated = false;
const listeners = new Set<Listener>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readPersisted(): WishlistState {
  if (!isBrowser()) {
    return EMPTY_STATE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<WishlistState> | null;
    if (!parsed || !Array.isArray(parsed.items)) {
      return EMPTY_STATE;
    }
    const items = parsed.items
      .filter(
        (candidate): candidate is WishlistItem =>
          candidate !== null &&
          typeof candidate === "object" &&
          typeof (candidate as WishlistItem).productId === "string" &&
          typeof (candidate as WishlistItem).productSlug === "string",
      )
      .slice(0, MAX_ITEMS);
    return { items };
  } catch {
    // Corrupt JSON in localStorage — discard and start fresh.
    return EMPTY_STATE;
  }
}

function persist(state: WishlistState) {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors — in-memory state still wins.
  }
}

function hydrateOnce() {
  if (isHydrated || !isBrowser()) {
    return;
  }
  cachedState = readPersisted();
  isHydrated = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }
    cachedState = readPersisted();
    notify();
  });
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(next: WishlistState) {
  cachedState = next;
  persist(next);
  notify();
}

/** Current wishlist for the browser tab. Hydrates from localStorage on first call. */
export function getWishlistSnapshot(): WishlistState {
  hydrateOnce();
  return cachedState;
}

/** Server snapshot — always empty so SSR pre-render matches the unhydrated client. */
export function getWishlistServerSnapshot(): WishlistState {
  return EMPTY_STATE;
}

/** Subscribe to wishlist mutations; returns an unsubscribe function. */
export function subscribeToWishlist(listener: Listener): () => void {
  listeners.add(listener);
  hydrateOnce();
  return () => {
    listeners.delete(listener);
  };
}

/** Cheap membership check used by the heart icon on product cards. */
export function isInWishlist(productId: string): boolean {
  hydrateOnce();
  return cachedState.items.some((saved) => saved.productId === productId);
}

/**
 * Toggle a product in the wishlist.
 * Returns `true` when the product was added, `false` when removed.
 * Drops the oldest entry silently if the wishlist is already at `MAX_ITEMS`.
 */
export function toggleWishlistItem(input: Omit<WishlistItem, "savedAt">): boolean {
  hydrateOnce();
  const alreadySaved = cachedState.items.some((saved) => saved.productId === input.productId);
  if (alreadySaved) {
    setState({
      items: cachedState.items.filter((saved) => saved.productId !== input.productId),
    });
    return false;
  }
  if (cachedState.items.length >= MAX_ITEMS) {
    cachedState = { items: cachedState.items.slice(1) };
  }
  setState({
    items: [...cachedState.items, { ...input, savedAt: new Date().toISOString() }],
  });
  return true;
}

/** Remove a single product from the wishlist by ID. */
export function removeWishlistItem(productId: string) {
  hydrateOnce();
  setState({
    items: cachedState.items.filter((saved) => saved.productId !== productId),
  });
}

/** Empty the wishlist entirely. */
export function clearWishlist() {
  setState({ items: [] });
}
