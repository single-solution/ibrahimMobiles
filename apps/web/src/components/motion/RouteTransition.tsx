"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface RouteTransitionProps {
  children: ReactNode;
}

interface RouteSnapshot {
  key: string;
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
 * On navigation we defer swapping `children` until the browser can run a
 * View Transition (when supported). That keeps the old page visible during
 * the cross-fade instead of flashing new content before the animation
 * starts — the failure mode plain CSS `route-enter` had on fast navigations.
 *
 * Fallback: CSS `.route-enter` keyframe on browsers without the API or when
 * the user prefers reduced motion. First paint still uses `.page-enter` on
 * `<main>`.
 */
export function RouteTransition({ children }: RouteTransitionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`;

  const [snapshot, setSnapshot] = useState<RouteSnapshot>(() => ({
    key: routeKey,
    node: children,
  }));
  const [isEntering, setIsEntering] = useState(false);
  const hasMounted = useRef(false);
  const enterTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      setSnapshot({ key: routeKey, node: children });
      return;
    }

    if (routeKey === snapshot.key) {
      return;
    }

    const nextSnapshot: RouteSnapshot = { key: routeKey, node: children };
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
  }, [routeKey, children, snapshot.key]);

  return (
    <div className={isEntering ? "route-enter" : undefined}>
      {snapshot.node}
    </div>
  );
}
