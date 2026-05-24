"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface RouteTransitionProps {
  children: ReactNode;
}

/**
 * Soft cross-fade when the route (path or query) commits. Runs on navigation
 * only — the first paint still uses `.page-enter` on `<main>`.
 */
export function RouteTransition({ children }: RouteTransitionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`;
  const [isEntering, setIsEntering] = useState(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    setIsEntering(true);
    const timeout = window.setTimeout(() => setIsEntering(false), 480);
    return () => window.clearTimeout(timeout);
  }, [routeKey]);

  return (
    <div className={isEntering ? "route-enter" : undefined}>
      {children}
    </div>
  );
}
