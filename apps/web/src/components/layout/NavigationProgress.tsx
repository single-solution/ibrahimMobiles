"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin progress bar that gives instant tap feedback on Link clicks.
 *
 * We can't subscribe to Next.js' router lifecycle directly, so we listen
 * for the click that *would* start a navigation (any anchor pointing to an
 * in-app path that doesn't open in a new tab) and a forward/back gesture,
 * then settle the bar once `pathname` (or `searchParams`) actually changes
 * — i.e. once the new route segment commits.
 *
 * Behaviour summary:
 *  - tap an internal link → bar appears instantly at ~30%, trickles to ~80%
 *  - new route commits   → bar fills to 100% and fades out
 *  - same-route click    → bar appears briefly, then auto-cancels
 *
 * `prefers-reduced-motion` collapses the bar to a flat top accent line
 * (no shimmer, no width tween) so motion-sensitive users still get the
 * "something is happening" signal without animation.
 */
const SHOW_AFTER_CLICK_MS = 0;
const TRICKLE_START_PERCENT = 30;
const TRICKLE_CEILING_PERCENT = 80;
const TRICKLE_STEP_PERCENT = 8;
const TRICKLE_INTERVAL_MS = 220;
const COMPLETION_FADE_MS = 220;
const SAME_ROUTE_AUTO_CANCEL_MS = 600;

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [percent, setPercent] = useState(0);
  const trickleIntervalRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);
  const autoCancelTimeoutRef = useRef<number | null>(null);
  const lastRouteKeyRef = useRef<string>(`${pathname}?${searchParams?.toString() ?? ""}`);

  useEffect(() => {
    const clearTrickle = () => {
      if (trickleIntervalRef.current !== null) {
        window.clearInterval(trickleIntervalRef.current);
        trickleIntervalRef.current = null;
      }
    };
    const clearFade = () => {
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
    };
    const clearAutoCancel = () => {
      if (autoCancelTimeoutRef.current !== null) {
        window.clearTimeout(autoCancelTimeoutRef.current);
        autoCancelTimeoutRef.current = null;
      }
    };

    const startTrickle = () => {
      clearTrickle();
      trickleIntervalRef.current = window.setInterval(() => {
        setPercent((current) => {
          if (current >= TRICKLE_CEILING_PERCENT) {
            return current;
          }
          return Math.min(current + TRICKLE_STEP_PERCENT, TRICKLE_CEILING_PERCENT);
        });
      }, TRICKLE_INTERVAL_MS);
    };

    const startNavigation = () => {
      clearFade();
      clearAutoCancel();
      setIsVisible(true);
      setPercent(TRICKLE_START_PERCENT);
      startTrickle();
      autoCancelTimeoutRef.current = window.setTimeout(() => {
        completeNavigation();
      }, SAME_ROUTE_AUTO_CANCEL_MS);
    };

    const completeNavigation = () => {
      clearTrickle();
      clearAutoCancel();
      setPercent(100);
      fadeTimeoutRef.current = window.setTimeout(() => {
        setIsVisible(false);
        setPercent(0);
      }, COMPLETION_FADE_MS);
    };

    const handleClick = (event: MouseEvent) => {
      // Ignore modified clicks — the browser will open a new tab / save the
      // link, not navigate the SPA.
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") {
        return;
      }
      if (anchor.hasAttribute("download")) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
        return;
      }
      // External link — let the browser take over, don't show the bar.
      try {
        const targetUrl = new URL(href, window.location.href);
        if (targetUrl.origin !== window.location.origin) {
          return;
        }
        const nextKey = `${targetUrl.pathname}?${targetUrl.searchParams.toString()}`;
        const currentKey = `${window.location.pathname}?${window.location.search.slice(1)}`;
        if (nextKey === currentKey) {
          return;
        }
      } catch {
        return;
      }

      if (SHOW_AFTER_CLICK_MS === 0) {
        startNavigation();
      } else {
        window.setTimeout(startNavigation, SHOW_AFTER_CLICK_MS);
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("popstate", startNavigation);

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("popstate", startNavigation);
      clearTrickle();
      clearFade();
      clearAutoCancel();
    };
    // The handlers depend only on stable refs / setters — we deliberately
    // bind once on mount so the click listener survives every navigation.
  }, []);

  useEffect(() => {
    const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`;
    if (routeKey === lastRouteKeyRef.current) {
      return;
    }
    lastRouteKeyRef.current = routeKey;

    if (fadeTimeoutRef.current !== null) {
      window.clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    if (autoCancelTimeoutRef.current !== null) {
      window.clearTimeout(autoCancelTimeoutRef.current);
      autoCancelTimeoutRef.current = null;
    }
    if (trickleIntervalRef.current !== null) {
      window.clearInterval(trickleIntervalRef.current);
      trickleIntervalRef.current = null;
    }

    setIsVisible(true);
    setPercent(100);
    fadeTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setPercent(0);
    }, COMPLETION_FADE_MS);
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden
      data-visible={isVisible ? "true" : "false"}
      className="nav-progress pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
    >
      <div
        className="nav-progress-bar h-full bg-[var(--color-accent-500)]"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
