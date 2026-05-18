"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Lock, Mail, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/TextField";
import { useStoreSettings } from "@/lib/storeSettingsContext";

const GENERIC_LOGIN_ERROR = "Invalid email or password.";

export default function AdminLoginPage() {
  const { siteName } = useStoreSettings();
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-canvas-deep)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3">
          <span className="grid size-12 place-items-center rounded-[var(--radius-lg)] bg-[var(--color-accent-500)] text-[var(--color-ink-900)] shadow-[var(--shadow-sm)]">
            <ShoppingBag size={20} strokeWidth={2.4} />
          </span>
          <div className="text-center leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
              Admin console
            </p>
            <p className="mt-1 text-base font-semibold tracking-tight text-[var(--color-ink-900)]">
              {siteName}
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-sm)]">
          <h1 className="text-center text-xl font-semibold tracking-[-0.02em] text-[var(--color-ink-900)]">
            Sign in
          </h1>

          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-[11px] text-[var(--color-ink-400)]">
          © {new Date().getFullYear()} {siteName}
        </p>
      </div>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="mt-7 space-y-5">
      <div className="h-10 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)]" />
      <div className="h-10 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)]" />
      <div className="h-10 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)]" />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only honour same-origin paths so the login page can't be turned into an
  // open redirect (e.g. ?callbackUrl=https://evil.example).
  const requestedCallback = searchParams.get("callbackUrl");
  const callbackUrl =
    requestedCallback &&
    requestedCallback.startsWith("/") &&
    !requestedCallback.startsWith("//")
      ? requestedCallback
      : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setError(GENERIC_LOGIN_ERROR);
      setIsSubmitting(false);
      return;
    }

    router.replace(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        leadingIcon={<Mail size={14} />}
        autoComplete="email"
        required
        disabled={isSubmitting}
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        leadingIcon={<Lock size={14} />}
        autoComplete="current-password"
        required
        disabled={isSubmitting}
      />

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="md"
        className="w-full"
        isLoading={isSubmitting}
        trailingIcon={!isSubmitting ? <ArrowRight size={14} /> : undefined}
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
