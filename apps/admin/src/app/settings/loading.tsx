import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

const SETTINGS_GROUP_COUNT = 4;
const FIELDS_PER_GROUP = 4;

/**
 * Settings view groups the StoreSettings fields into sectioned cards
 * (Storefront identity / Support / Social / Policy thresholds, …),
 * each with a header strip and a stack of label-over-input rows.
 *
 * The exact group count and field-per-group can shift as settings
 * evolve, so we draw 4 groups with 4 fields each — close enough that
 * the skeleton fills the viewport without overshooting the real form.
 */
export default function SettingsLoading() {
  return (
    <AdminPageSkeleton
      label="Loading settings"
      eyebrowWidthClass="w-10"
      titleWidthClass="w-32"
    >
      <div className="space-y-6">
        {Array.from({ length: SETTINGS_GROUP_COUNT }).map((_, groupIndex) => (
          <section
            key={groupIndex}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]"
          >
            <header className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-5 py-3.5">
              <Skeleton shape="text" className="h-3.5 w-40" />
              <Skeleton shape="text" className="mt-1.5 h-3 w-2/3" />
            </header>
            <div className="grid grid-cols-1 gap-5 px-5 py-5 md:grid-cols-2">
              {Array.from({ length: FIELDS_PER_GROUP }).map((_, fieldIndex) => (
                <div key={fieldIndex} className="space-y-1.5">
                  <Skeleton shape="text" className="h-3 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </section>
        ))}
        <div className="flex justify-end">
          <Skeleton shape="pill" className="h-10 w-36" />
        </div>
      </div>
    </AdminPageSkeleton>
  );
}
