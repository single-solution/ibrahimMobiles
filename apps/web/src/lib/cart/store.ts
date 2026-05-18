"use client";

/**
 * Browser-local cart store.
 *
 * Single source of truth, persisted to `localStorage`, exposed through a
 * `useSyncExternalStore` subscription so any cart-aware component re-renders
 * when the cart changes. Cross-tab updates are picked up via the `storage`
 * event so the count badge stays in sync if the customer adds something in
 * another tab.
 *
 * Server-side fallback: when no DOM is present we return an empty snapshot
 * so server components can read the cart shape without exploding.
 */

import type { CartItem } from "@/lib/cart/types";

const STORAGE_KEY = "storefront:cart:v1";
const MAX_QUANTITY = 10;
const MAX_LINES = 20;

type Listener = () => void;

interface CartState {
  items: CartItem[];
}

const EMPTY_STATE: CartState = { items: [] };

let cachedState: CartState = EMPTY_STATE;
let isHydrated = false;
const listeners = new Set<Listener>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readPersisted(): CartState {
  if (!isBrowser()) {
    return EMPTY_STATE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<CartState> | null;
    if (!parsed || !Array.isArray(parsed.items)) {
      return EMPTY_STATE;
    }
    // Defensive: drop any malformed lines so a corrupted localStorage entry
    // doesn't poison every render.
    const items = parsed.items
      .filter(
        (candidate): candidate is CartItem =>
          candidate !== null &&
          typeof candidate === "object" &&
          typeof (candidate as CartItem).id === "string" &&
          typeof (candidate as CartItem).productId === "string" &&
          typeof (candidate as CartItem).variantId === "string" &&
          typeof (candidate as CartItem).quantity === "number",
      )
      .slice(0, MAX_LINES);
    return { items };
  } catch {
    // Corrupt JSON in localStorage — discard and start fresh.
    return EMPTY_STATE;
  }
}

function persist(state: CartState) {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota-exceeded; in-memory state still wins.
  }
}

function hydrateOnce() {
  if (isHydrated || !isBrowser()) {
    return;
  }
  cachedState = readPersisted();
  isHydrated = true;
  // Cross-tab sync — when another tab updates the cart key, refresh ours.
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

function setState(next: CartState) {
  cachedState = next;
  persist(next);
  notify();
}

/** Current cart state for the browser tab. Hydrates from localStorage on first call. */
export function getCartSnapshot(): CartState {
  hydrateOnce();
  return cachedState;
}

/** Server snapshot — always empty so SSR pre-render matches the unhydrated client. */
export function getCartServerSnapshot(): CartState {
  return EMPTY_STATE;
}

/** Subscribe to cart mutations; returns an unsubscribe function. */
export function subscribeToCart(listener: Listener): () => void {
  listeners.add(listener);
  hydrateOnce();
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Add a line to the cart, merging onto an existing variant if present.
 * Silently no-ops when the cart already holds `MAX_LINES` distinct lines —
 * UI should disable add buttons before this guard ever fires.
 */
export function addCartItem(item: Omit<CartItem, "id" | "quantity"> & { quantity?: number }) {
  hydrateOnce();
  const id = `${item.productId}:${item.variantId}`;
  const quantityToAdd = clampQuantity(item.quantity ?? 1);

  const existingIndex = cachedState.items.findIndex((line) => line.id === id);
  let nextItems: CartItem[];
  if (existingIndex >= 0) {
    nextItems = cachedState.items.map((line, index) =>
      index === existingIndex
        ? { ...line, quantity: clampQuantity(line.quantity + quantityToAdd) }
        : line,
    );
  } else {
    if (cachedState.items.length >= MAX_LINES) {
      return;
    }
    nextItems = [
      ...cachedState.items,
      { ...item, id, quantity: quantityToAdd },
    ];
  }
  setState({ items: nextItems });
}

/** Drop a line by its compound `productId:variantId` cart ID. */
export function removeCartItem(id: string) {
  hydrateOnce();
  setState({ items: cachedState.items.filter((line) => line.id !== id) });
}

/** Set a line's quantity; passing `0` (or any non-finite value) removes the line. */
export function updateCartItemQuantity(id: string, quantity: number) {
  hydrateOnce();
  const clamped = clampQuantity(quantity);
  if (clamped === 0) {
    removeCartItem(id);
    return;
  }
  setState({
    items: cachedState.items.map((line) =>
      line.id === id ? { ...line, quantity: clamped } : line,
    ),
  });
}

/** Empty the cart entirely. */
export function clearCart() {
  setState({ items: [] });
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity < 0) {
    return 0;
  }
  return Math.min(MAX_QUANTITY, Math.floor(quantity));
}
