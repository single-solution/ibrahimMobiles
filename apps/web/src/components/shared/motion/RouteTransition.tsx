"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface RouteTransitionProps {
  children: ReactNode;
}

interface RouteSnapshot {
  /** Full route identity — pathname + query. Drives when children swap. */
  contentKey: string;
  /** Pathname only — drives the cross-fade animation. */
  pathnameKey: string;
  node: ReactNode;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function supportsViewTransition(): boolean {
  return (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    typeof document.startViewTransition === "function"
  );
}

/**
 * Route commit transition.
 *
 * Two kinds of URL change, two treatments:
 *
 *   • **Query-only** (`?grade=…`, `?grades=1`, sort, page) — swap `children`
 *     in place with no cross-fade. Filter chips already have optimistic UI
 *     and `NavigationPendingFallback` owns the products skeleton; a
 *     full-page View Transition here made the header and chrome feel like
 *     they were reloading.
 *
 *   • **Pathname change** (`/shop/a` → `/shop/b`, `/account` → `/cart`) —
 *     run a View Transition scoped to `<main>` (see `.storefront-main` in
 *     globals.css) so the header, footer, and tab bar stay visually fixed.
 *
 * Fallback: CSS `.route-enter` keyframe on browsers without the API or when
 * the user prefers reduced motion. First paint still uses `.page-enter` on
 * `<main>`.
 */
export function RouteTransition({ children }: RouteTransitionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathnameKey = pathname ?? "";
  const contentKey = `${pathnameKey}?${searchParams?.toString() ?? ""}`;

  const [snapshot, setSnapshot] = useState<RouteSnapshot>(() => ({
    contentKey,
    pathnameKey,
    node: children,
  }));
  const [isEntering, setIsEntering] = useState(false);
  const hasMounted = useRef(false);
  const enterTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      setSnapshot({ contentKey, pathnameKey, node: children });
      return;
    }

    if (contentKey === snapshot.contentKey) {
      return;
    }

    const nextSnapshot: RouteSnapshot = { contentKey, pathnameKey, node: children };
    const pathnameChanged = pathnameKey !== snapshot.pathnameKey;

    // Filter / sort / pagination — update content only; no page-wide motion.
    if (!pathnameChanged) {
      const frame = window.requestAnimationFrame(() => {
        setSnapshot(nextSnapshot);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const useViewTransition =
      supportsViewTransition() && !prefersReducedMotion();

    if (useViewTransition) {
      document.startViewTransition(() => {
        setSnapshot(nextSnapshot);
      });
      return;
    }

    // Defer the DOM swap + fallback keyframe to the next frame so we
    // never call setState synchronously inside the effect body (eslint
    // `react-hooks/set-state-in-effect`) and the outgoing paint is still
    // visible for one frame before the cross-fade starts.
    const frame = window.requestAnimationFrame(() => {
      setSnapshot(nextSnapshot);
      setIsEntering(true);
      if (enterTimeoutRef.current != null) {
        window.clearTimeout(enterTimeoutRef.current);
      }
      enterTimeoutRef.current = window.setTimeout(() => {
        setIsEntering(false);
        enterTimeoutRef.current = undefined;
      }, 480);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (enterTimeoutRef.current != null) {
        window.clearTimeout(enterTimeoutRef.current);
        enterTimeoutRef.current = undefined;
      }
    };
  }, [contentKey, pathnameKey, children, snapshot.contentKey, snapshot.pathnameKey]);

  return (
    <div className={isEntering ? "route-enter" : undefined}>
      {snapshot.node}
    </div>
  );
}
