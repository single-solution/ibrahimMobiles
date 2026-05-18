"use client";

/**
 * Top-level error boundary for the storefront.
 *
 * Next renders this component when a server or client component throws an
 * unhandled exception. We log the error so it shows up in our observability
 * pipeline, then offer the customer a retry — most failures are transient
 * (DB hiccup, third-party API timeout) and a single retry resolves them.
 *
 * The bundler hands us a `digest` we can include in any support follow-up
 * without leaking the internal error message to the customer.
 */
import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.error("[storefront] route error", error);
    }
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--color-accent-700)] sm:text-xs">
        Something went wrong
      </p>
      <h1 className="font-semibold mt-2 text-3xl leading-[0.95] tracking-tight text-[var(--color-ink-900)] sm:mt-3 sm:text-5xl lg:text-6xl">
        We hit a snag.
      </h1>
      <p className="mt-2.5 max-w-md text-[13px] text-[var(--color-ink-600)] sm:mt-3 sm:text-base">
        The page couldn&apos;t finish loading. Please try again — if it keeps
        happening, message us on WhatsApp and we&apos;ll get you sorted.
      </p>
      {error.digest ? (
        <p className="mt-3 text-[11px] text-[var(--color-ink-500)]">
          Reference code: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2 sm:mt-7 sm:gap-3">
        <Button onClick={reset} variant="primary" size="sm" className="md:h-11 md:px-5 md:text-sm">
          Try again
        </Button>
        <ButtonLink href="/" variant="outline" size="sm" className="md:h-11 md:px-5 md:text-sm">
          Go home
        </ButtonLink>
      </div>
    </div>
  );
}
