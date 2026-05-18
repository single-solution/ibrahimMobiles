"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Single, app-wide IntersectionObserver that flips any `.reveal` element
 * into the visible state once it scrolls into view. Pair with the
 * `.reveal` or `.reveal-fade` class for the actual animation.
 *
 * Architecture notes:
 *
 *   • **The hidden state is purely CSS.** A `.reveal` element starts at
 *     `opacity: 0` and animates in only when `data-reveal="visible"` is
 *     present. We do **not** render `data-reveal="hidden"` from SSR
 *     because that attribute was the root cause of React 19's hydration
 *     mismatch under Next 16's progressive Suspense hydration: the
 *     observer would flip the attribute to `"visible"` while React was
 *     still reconciling sibling boundaries.
 *
 *   • **One observer per app, not per element.** We disconnect on
 *     unmount/route change and rebuild — keeps memory flat as the user
 *     navigates.
 *
 *   • **MutationObserver covers dynamic content.** Lazy-loaded sections,
 *     infinite scroll, modal contents all get observed without each
 *     component needing to register itself.
 *
 *   • **`rAF + microtask` defer** ensures we never observe (and
 *     therefore never mutate) during the initial hydration pass. Cheap
 *     insurance against future regressions.
 */
export function RevealRoot() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const REVEAL_CANDIDATE = ".reveal:not([data-reveal='visible'])";

    const reveal = (target: Element) => {
      target.setAttribute("data-reveal", "visible");
    };

    const supportsIO = "IntersectionObserver" in window;
    if (!supportsIO) {
      document.querySelectorAll<HTMLElement>(REVEAL_CANDIDATE).forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        }
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.05,
      },
    );

    const observeAll = () => {
      document
        .querySelectorAll<HTMLElement>(REVEAL_CANDIDATE)
        .forEach((element) => observer.observe(element));
    };

    const mutation = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }
          if (node.matches?.(REVEAL_CANDIDATE)) {
            observer.observe(node);
          }
          node
            .querySelectorAll?.<HTMLElement>(REVEAL_CANDIDATE)
            .forEach((element) => observer.observe(element));
        });
      }
    });

    // Defer past the hydration window. React 19 + Next 16 stream-hydrate
    // sibling Suspense boundaries progressively, so a page like `/shop/[category]`
    // can have product cards still hydrating after `RevealRoot` itself
    // mounts. `requestIdleCallback` fires only when the main thread is
    // idle — which by definition is after React has finished its current
    // hydration pass. We fall back to `setTimeout` on browsers without
    // `requestIdleCallback` (Safari has it now too, but kept for safety).
    let isCancelled = false;
    type IdleHandle = number;
    const scheduleIdle = (callback: () => void): IdleHandle => {
      if (typeof window.requestIdleCallback === "function") {
        return window.requestIdleCallback(callback, { timeout: 500 });
      }
      return window.setTimeout(callback, 200);
    };
    const cancelIdle = (handle: IdleHandle): void => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(handle);
        return;
      }
      window.clearTimeout(handle);
    };

    const handle = scheduleIdle(() => {
      if (isCancelled) {
        return;
      }
      observeAll();
      mutation.observe(document.body, { childList: true, subtree: true });
    });

    return () => {
      isCancelled = true;
      cancelIdle(handle);
      observer.disconnect();
      mutation.disconnect();
    };
  }, [pathname]);

  return null;
}
