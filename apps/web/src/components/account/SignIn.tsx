"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PhoneOtpForm } from "@/components/account/PhoneOtpForm";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

export function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { siteName } = useStoreSettings();
  const requestedNext = searchParams?.get("next");
  const next =
    requestedNext &&
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//")
      ? requestedNext
      : "/account";

  function handleVerified() {
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-8 md:pb-16 md:pt-16">
      <div className="text-center">
        <span className="inline-grid size-12 place-items-center rounded-2xl bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
          <ShieldCheck size={20} strokeWidth={2.4} />
        </span>
        <h1 className="mt-4 font-headline text-[28px] font-semibold tracking-tight text-[var(--color-ink-900)] md:text-[36px]">
          Sign in to {siteName}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-ink-500)] md:text-sm">
          We&rsquo;ll send a one-time code to your phone — no password needed.
        </p>
      </div>

      <Card className="mt-6 p-5 md:mt-8 md:p-6">
        <PhoneOtpForm
          phoneSubmitLabel="Send code"
          codeSubmitLabel="Verify and sign in"
          onVerified={handleVerified}
          phonePlaceholder="+92 320 4862403"
          autoFocusPhone
        />
      </Card>

      <p className="mt-4 text-center text-[12px] text-[var(--color-ink-500)]">
        Just want to track an order?{" "}
        <Link href="/track" className="link-underline font-semibold text-[var(--color-accent-700)]">
          Use the public tracker
        </Link>
        .
      </p>
    </div>
  );
}
