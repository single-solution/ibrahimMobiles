"use client";

import { ShieldCheck } from "lucide-react";

import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

/**
 * Sign-in fallback. The icon badge, heading, and subtitle are static
 * (or context-driven) copy — we render them live so navigating to
 * `/account/sign-in` shows the real chrome immediately. Only the OTP
 * form card stays skeletoned because that's the interactive piece the
 * `SignIn` client component hydrates.
 */
export default function SignInLoading() {
  const { siteName } = useStoreSettings();

  return (
    <SkeletonScreen label="Loading sign-in">
      <div className="mx-auto max-w-md px-4 pb-24 pt-8 md:pb-16 md:pt-16">
        <div className="flex flex-col items-center text-center">
          <span className="inline-grid size-12 place-items-center rounded-2xl bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
            <ShieldCheck size={20} strokeWidth={2.4} />
          </span>
          <h1 className="mt-4 font-headline text-[28px] font-semibold tracking-tight text-[var(--color-ink-900)] md:text-[36px]">
            Sign in to {siteName}
          </h1>
          <p className="mx-auto mt-1 max-w-prose text-[13px] text-[var(--color-ink-500)] md:text-sm">
            We&rsquo;ll send a one-time code to your phone — no password needed.
          </p>
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
