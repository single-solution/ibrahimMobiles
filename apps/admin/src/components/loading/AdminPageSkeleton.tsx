import type { ReactNode } from "react";

import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { AdminShell } from "@/components/AdminShell";

/**
 * Shared skeleton for the standard admin page shape:
 *
 *   AdminShell
 *     └─ PageTitle (eyebrow, title, optional description, optional actions)
 *     └─ section.mt-8 — content area (caller supplies the inner skeleton)
 *
 * The PageTitle skeleton is sized to *exactly* match the real component
 * (`@/components/PageTitle.tsx`): 11px eyebrow, ~30px title, ~14px
 * description, all preserving the same spacing rules. The content slot
 * is wrapped in the same `<section className="mt-8">` every page uses,
 * so when the real data lands the layout doesn't shift one pixel.
 *
 * Why we re-mount `AdminShell` inside `loading.tsx`:
 *   The shell is currently rendered by each `page.tsx`, not by a parent
 *   layout. React's reconciler keeps the AdminShell instance alive
 *   between the loading fallback and the resolved page (same component
 *   type, same position), so the sidebar / topbar don't flash.
 */
interface AdminPageSkeletonProps {
  /** Width of the eyebrow text skeleton in Tailwind units (w-16 = 64px). */
  eyebrowWidthClass?: string;
  /** Width of the title skeleton. Match the real heading length. */
  titleWidthClass?: string;
  /** When true, also render a description line skeleton (matches the
   *  description rendered on most list pages). */
  hasDescription?: boolean;
  /** When true, render an action-area skeleton on the right of the
   *  PageTitle row (matches pages with a top-right "Add product" / etc.
   *  button). */
  hasActions?: boolean;
  /** Skeleton for the content area below the title (table, form, grid). */
  children: ReactNode;
  /** Accessible label for the loading region. */
  label?: string;
}

export function AdminPageSkeleton({
  eyebrowWidthClass = "w-16",
  titleWidthClass = "w-40",
  hasDescription = false,
  hasActions = false,
  children,
  label = "Loading…",
}: AdminPageSkeletonProps) {
  return (
    <SkeletonScreen label={label}>
      <AdminShell>
        <PageTitleSkeleton
          eyebrowWidthClass={eyebrowWidthClass}
          titleWidthClass={titleWidthClass}
          hasDescription={hasDescription}
          hasActions={hasActions}
        />
        <section className="mt-8">{children}</section>
      </AdminShell>
    </SkeletonScreen>
  );
}

interface PageTitleSkeletonProps {
  eyebrowWidthClass: string;
  titleWidthClass: string;
  hasDescription: boolean;
  hasActions: boolean;
}

/** Mirrors the real `<PageTitle>` from `@/components/PageTitle`:
 *   - 11px eyebrow with 0.18em tracking (rendered as a short pill of text)
 *   - 30px (text-3xl) title, leading-[1.1]
 *   - optional description (text-sm, max-w-2xl)
 *   - optional actions cluster on the right
 *   - `flex-wrap items-end justify-between gap-4` outer row */
function PageTitleSkeleton({
  eyebrowWidthClass,
  titleWidthClass,
  hasDescription,
  hasActions,
}: PageTitleSkeletonProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton shape="text" className={`h-2.5 ${eyebrowWidthClass}`} />
        <Skeleton shape="text" className={`h-8 ${titleWidthClass}`} />
        {hasDescription && (
          <div className="max-w-2xl space-y-1.5">
            <Skeleton shape="text" className="h-3.5 w-full" />
            <Skeleton shape="text" className="h-3.5 w-3/4" />
          </div>
        )}
      </div>
      {hasActions && (
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton shape="pill" className="h-9 w-32" />
        </div>
      )}
    </header>
  );
}
