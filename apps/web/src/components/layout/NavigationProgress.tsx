"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useNavigationProgressCount } from "@/lib/navigation/navigationProgress";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";

/**
 * Thin progress bar that gives instant tap feedback on navigation.
 *
 * Two trigger sources feed one bar:
 *
 *   1. **Anchor / `<Link>` clicks + back/forward** — we listen for the
 *      click that *would* start a navigation (any in-app anchor that
 *      doesn't open a new tab) and `popstate`, so the bar fires the
 *      instant the user taps.
 *   2. **Programmatic transitions** — components that update the URL
 *      via `useNavigationTransition().startNavigation(...)` bump a
 *      shared counter. When the counter goes from 0 to >0, the bar
 *      starts; when it drains, the bar completes. This covers filter
 *      chips, segment toggles, view-mode tabs, sort dropdowns, and
 *      anything else that calls `router.push/replace` outside an `<a>`.
 *
 * In both cases the new route segment commit (detected via `usePathname` /
 * `useSearchParams`) drives the bar to 100% and the fade-out.
 *
 * `prefers-reduced-motion` collapses the bar to a flat top accent line
 * (no shimmer, no width tween) so motion-sensitive users still get the
 * "something is happening" signal without animation.
 */
const SHOW_AFTER_CLICK_MS = 0;
const TRICKLE_START_PERCENT = 30;
const TRICKLE_CEILING_PERCENT = 80;
const TRICKLE_STEP_PERCENT = 8;
const TRICKLE_INTERVAL_MS = 260;
const COMPLETION_FADE_MS = 340;
const SAME_ROUTE_AUTO_CANCEL_MS = 15000;

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const programmaticCount = useNavigationProgressCount();
  const [isVisible, setIsVisible] = useState(false);
  const [percent, setPercent] = useState(0);
  const trickleIntervalRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);
  const autoCancelTimeoutRef = useRef<number | null>(null);
  const lastRouteKeyRef = useRef<string>(`${pathname}?${searchParams?.toString() ?? ""}`);

  const clearTrickle = useCallback(() => {
    if (trickleIntervalRef.current !== null) {
      window.clearInterval(trickleIntervalRef.current);
      trickleIntervalRef.current = null;
    }
  }, []);

  const clearFade = useCallback(() => {
    if (fadeTimeoutRef.current !== null) {
      window.clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
  }, []);

  const clearAutoCancel = useCallback(() => {
    if (autoCancelTimeoutRef.current !== null) {
      window.clearTimeout(autoCancelTimeoutRef.current);
      autoCancelTimeoutRef.current = null;
    }
  }, []);

  const completeNavigation = useCallback(() => {
    clearTrickle();
    clearAutoCancel();
    setPercent(100);
    clearFade();
    fadeTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setPercent(0);
    }, COMPLETION_FADE_MS);
  }, [clearAutoCancel, clearFade, clearTrickle]);

  const startNavigation = useCallback(() => {
    clearFade();
    clearAutoCancel();
    setIsVisible(true);
    setPercent(TRICKLE_START_PERCENT);
    clearTrickle();
    trickleIntervalRef.current = window.setInterval(() => {
      setPercent((current) => {
        if (current >= TRICKLE_CEILING_PERCENT) {
          return current;
        }
        return Math.min(current + TRICKLE_STEP_PERCENT, TRICKLE_CEILING_PERCENT);
      });
    }, TRICKLE_INTERVAL_MS);
    autoCancelTimeoutRef.current = window.setTimeout(() => {
      completeNavigation();
    }, SAME_ROUTE_AUTO_CANCEL_MS);
  }, [clearAutoCancel, clearFade, clearTrickle, completeNavigation]);

  useEffect(() => {
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
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
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
  }, [clearAutoCancel, clearFade, clearTrickle, startNavigation]);

  // Programmatic transitions (filter chips, view-mode tabs, …) bump
  // `programmaticCount`. Rising edge starts the bar; falling edge
  // completes it. The pathname/searchParams effect below provides a
  // belt-and-suspenders settle in case the count somehow lags the URL.
  useEffect(() => {
    if (programmaticCount > 0) {
      scheduleStateUpdate(startNavigation);
      return;
    }
    if (isVisible) {
      scheduleStateUpdate(completeNavigation);
    }
    // `isVisible` is intentionally not in deps — we only react to count
    // transitions, not bar visibility flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programmaticCount, startNavigation, completeNavigation]);

  useEffect(() => {
    const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`;
    if (routeKey === lastRouteKeyRef.current) {
      return;
    }
    lastRouteKeyRef.current = routeKey;
    completeNavigation();
  }, [pathname, searchParams, completeNavigation]);

  return (
    <>
      <div
        aria-hidden
        data-visible={isVisible ? "true" : "false"}
        className="nav-progress pointer-events-none fixed inset-x-0 top-0 z-[var(--z-max)] h-[2px]"
      >
        <div
          className="nav-progress-bar h-full w-full bg-[var(--color-accent-500)]"
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </div>

      {isVisible && (
        <div
          aria-hidden
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--color-ink-900)]/15 backdrop-blur-[2px]"
          style={{ animation: "nav-overlay-in 0.25s ease-out 0.25s both" }}
        >
          <div className="grid grid-cols-2 gap-[5px]">
            <div
              className="size-3.5 bg-[var(--color-accent-500)]"
              style={{ animation: "cvs-shatter-tl 1.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite" }}
            />
            <div
              className="size-3.5 bg-[var(--color-canvas)]"
              style={{ animation: "cvs-shatter-tr 1.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite" }}
            />
            <div
              className="size-3.5 bg-[var(--color-canvas)]"
              style={{ animation: "cvs-shatter-bl 1.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite" }}
            />
            <div
              className="size-3.5 bg-[var(--color-accent-500)]"
              style={{ animation: "cvs-shatter-br 1.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
