import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

export default function AccountMessagesLoading() {
  return (
    <SkeletonScreen
      label="Loading messages"
      className="mx-auto max-w-[1440px] px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8"
    >
      <Skeleton shape="text" className="hidden h-3 w-40 md:block" />

      <div className="mt-4 space-y-2 md:mt-6">
        <Skeleton shape="text" className="h-3 w-16" />
        <Skeleton shape="text" className="h-10 w-56" />
        <Skeleton shape="text" className="h-3 w-80 max-w-full" />
      </div>

      <div className="mt-6 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] md:mt-8">
        <div className="grid min-h-[520px] md:grid-cols-[minmax(280px,340px)_1fr]">
          <div className="hidden border-r border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/50 p-4 md:block">
            <Skeleton shape="text" className="h-4 w-24" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  shape="block"
                  className="h-[76px] rounded-[var(--radius-lg)]"
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="border-b border-[var(--color-ink-100)] px-5 py-4">
              <Skeleton shape="text" className="h-5 w-40" />
              <Skeleton shape="text" className="mt-2 h-3 w-28" />
            </div>
            <div className="flex-1 space-y-4 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={index}
                  shape="block"
                  className={
                    index % 2 === 0
                      ? "ml-auto h-14 w-[58%] rounded-[var(--radius-lg)]"
                      : "h-14 w-[62%] rounded-[var(--radius-lg)]"
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}
