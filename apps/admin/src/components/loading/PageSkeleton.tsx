import type { ReactNode } from "react";

import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { Shell } from "@/components/layout/Shell";

/**
 * Shared skeleton for the standard admin page shape:
 *
 *   Shell
 *     └─ optional compact action row
 *     └─ content area (caller supplies the inner skeleton)
 *
 * The old tall PageTitle header is intentionally gone from admin pages.
 *
 * Why we re-mount `Shell` inside `loading.tsx`:
 *   The shell is currently rendered by each `page.tsx`, not by a parent
 *   layout. React's reconciler keeps the Shell instance alive
 *   between the loading fallback and the resolved page (same component
 *   type, same position), so the sidebar / topbar don't flash.
 */
interface PageSkeletonProps {
  /** When true, render an action-area skeleton on the right of the
   *  PageTitle row (matches pages with a top-right "Add product" / etc.
   *  button). */
  hasActions?: boolean;
  /** Skeleton for the content area below the title (table, form, grid). */
  children: ReactNode;
  /** Accessible label for the loading region. */
  label?: string;
}

export function PageSkeleton({
  hasActions = false,
  children,
  label = "Loading…",
}: PageSkeletonProps) {
  return (
    <SkeletonScreen label={label}>
      <Shell>
        <PageTitleSkeleton hasActions={hasActions} />
        <section>{children}</section>
      </Shell>
    </SkeletonScreen>
  );
}

interface PageTitleSkeletonProps {
  hasActions: boolean;
}

function PageTitleSkeleton({ hasActions }: PageTitleSkeletonProps) {
  if (!hasActions) {
    return null;
  }
  return (
    <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
      <Skeleton shape="pill" className="h-9 w-32" />
    </div>
  );
}
