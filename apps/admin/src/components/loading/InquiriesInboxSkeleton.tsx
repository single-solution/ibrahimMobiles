import { classNames } from "@store/shared";

export function InquiriesInboxSkeleton() {
  return (
    <div className="flex min-h-[min(72vh,680px)] flex-1 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="hidden w-full shrink-0 flex-col border-r border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/50 p-4 lg:flex lg:w-[min(340px,38%)] lg:max-w-sm">
          <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-ink-100)]" />
          <div className="mt-3 h-9 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-ink-100)]/80" />
          <div className="mt-3 flex gap-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-7 w-16 animate-pulse rounded-full bg-[var(--color-ink-100)]/70"
              />
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[76px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-ink-100)]/70"
              />
            ))}
          </div>
        </aside>
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-[var(--color-ink-100)] px-5 py-4">
            <div className="h-5 w-40 animate-pulse rounded bg-[var(--color-ink-100)]" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-[var(--color-ink-100)]" />
          </div>
          <div className="flex-1 space-y-4 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className={classNames(
                  "h-14 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-ink-100)]/70",
                  index % 2 === 0 ? "ml-auto w-[58%]" : "w-[62%]",
                )}
              />
            ))}
          </div>
          <div className="border-t border-[var(--color-ink-100)] p-4">
            <div className="h-11 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-ink-100)]/70" />
          </div>
        </section>
      </div>
    </div>
  );
}
