"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

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
 *     mismatch under Next 16's progressive Suspense hydration.
 *
 *   • **One observer per app, not per element.** We disconnect on
 *     unmount/route change and rebuild — keeps memory flat as the user
 *     navigates.
 *
 *   • **MutationObserver covers dynamic content.** Lazy-loaded sections,
 *     infinite scroll, modal contents all get observed without each
 *     component needing to register itself.
 *
 *   • **Above-the-fold elements reveal immediately** so route/filter
 *     swaps never leave visible content at opacity 0 waiting for idle.
 */
export function RevealRoot() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const REVEAL_CANDIDATE = ".reveal:not([data-reveal='visible'])";

    const reveal = (target: Element) => {
      target.setAttribute("data-reveal", "visible");
    };

    const isInViewport = (element: HTMLElement): boolean => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      return rect.top < viewportHeight * 0.94 && rect.bottom > 0;
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
        rootMargin: "0px 0px -6% 0px",
        threshold: 0.04,
      },
    );

    const observeAll = () => {
      document.querySelectorAll<HTMLElement>(REVEAL_CANDIDATE).forEach((element) => {
        if (isInViewport(element)) {
          reveal(element);
          return;
        }
        observer.observe(element);
      });
    };

    const mutation = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }
          if (node.matches?.(REVEAL_CANDIDATE)) {
            if (isInViewport(node)) {
              reveal(node);
            } else {
              observer.observe(node);
            }
          }
          node
            .querySelectorAll?.<HTMLElement>(REVEAL_CANDIDATE)
            .forEach((element) => {
              if (isInViewport(element)) {
                reveal(element);
              } else {
                observer.observe(element);
              }
            });
        });
      }
    });

    let isCancelled = false;
    type IdleHandle = number;
    const scheduleIdle = (callback: () => void): IdleHandle => {
      if (typeof window.requestIdleCallback === "function") {
        return window.requestIdleCallback(callback, { timeout: 120 });
      }
      return window.setTimeout(callback, 48);
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
  }, [routeKey]);

  return null;
}
