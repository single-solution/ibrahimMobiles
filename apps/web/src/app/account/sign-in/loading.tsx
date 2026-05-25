import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * Sign-in segment fallback. Mirrors `app/account/sign-in/page.tsx` →
 * `components/account/SignIn.tsx`: centered icon badge + heading +
 * subtitle + a single card containing the phone-OTP form.
 *
 * Without this file the segment inherited the parent `account/loading.tsx`
 * (dashboard-shaped: loyalty card, stats row, two-column orders + sidebar)
 * which is the wrong shape for a sign-in form and visibly snapped on
 * arrival.
 */
export default function SignInLoading() {
  return (
    <SkeletonScreen label="Loading sign-in">
      <div className="mx-auto max-w-md px-4 pb-24 pt-8 md:pb-16 md:pt-16">
        <div className="flex flex-col items-center text-center">
          <Skeleton className="size-12 rounded-2xl" />
          <Skeleton shape="text" className="mt-4 h-7 w-3/4 md:h-9" />
          <Skeleton shape="text" className="mt-2 h-3 w-full max-w-[280px]" />
        </div>

        <div className="mt-6 space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] md:mt-8 md:p-6">
          <div className="space-y-2">
            <Skeleton shape="text" className="h-3 w-20" />
            <Skeleton shape="pill" className="h-11 w-full" />
          </div>
          <Skeleton shape="pill" className="h-11 w-full" />
        </div>
      </div>
    </SkeletonScreen>
  );
}
