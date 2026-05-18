"use client";

import { forwardRef, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ArrowRight, Phone as PhoneIcon, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { classNames, OTP_CODE_LENGTH } from "@store/shared";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

type Step = "phone" | "code";

interface IssueOtpResponse {
  phoneTail?: string;
  expiresAt?: string;
  error?: string;
}

const RESEND_AFTER_SECONDS = 30;
const COUNTDOWN_TICK_MS = 1_000;
const CODE_AUTOFOCUS_DELAY_MS = 80;
/** Strip any non-digits typed/pasted into the verification input. */
const NON_DIGIT_REGEX = /\D/g;

export function SignInView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { siteName } = useStoreSettings();
  // Only same-origin paths are honoured. Anything else (`https://evil.com`,
  // protocol-relative URLs like `//evil.com`, etc.) falls back to /account
  // so a phishing link can't turn this into an open redirect.
  const requestedNext = searchParams?.get("next");
  const next =
    requestedNext &&
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//")
      ? requestedNext
      : "/account";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneTail, setPhoneTail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement | null>(null);

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }
    const id = window.setInterval(() => {
      setResendIn((prev) => Math.max(0, prev - 1));
    }, COUNTDOWN_TICK_MS);
    return () => window.clearInterval(id);
  }, [resendIn]);

  async function requestCode(currentPhone: string) {
    setIsSendingCode(true);
    setError(null);
    try {
      const response = await fetch("/api/storefront/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: currentPhone }),
      });
      const data = (await response.json()) as IssueOtpResponse;
      if (!response.ok) {
        setError(data.error ?? "Couldn't send code. Please try again.");
        const retryAfterSeconds = Number(response.headers.get("Retry-After"));
        if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
          setResendIn(retryAfterSeconds);
        }
        return false;
      }
      setPhoneTail(data.phoneTail ?? null);
      setStep("code");
      setResendIn(RESEND_AFTER_SECONDS);
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phone.trim()) {
      return;
    }
    const wasIssued = await requestCode(phone.trim());
    if (wasIssued) {
      window.setTimeout(() => codeRef.current?.focus(), CODE_AUTOFOCUS_DELAY_MS);
    }
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) {
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      const result = await signIn("customer-otp", {
        redirect: false,
        phoneNumber: phone.trim(),
        code: code.trim(),
      });
      if (result?.error) {
        setError("That code didn't match. Please try again.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsVerifying(false);
    }
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
        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <Field
              label="Phone number"
              value={phone}
              onChange={setPhone}
              placeholder="+92 320 4862403"
              icon={<PhoneIcon size={14} />}
              inputMode="tel"
              autoFocus
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isSendingCode}
              trailingIcon={<ArrowRight size={14} />}
              disabled={!phone.trim() || isSendingCode}
            >
              Send code
            </Button>
            {error && <ErrorMessage message={error} />}
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <p className="text-[12.5px] text-[var(--color-ink-600)]">
              Enter the {OTP_CODE_LENGTH}-digit code we sent to{" "}
              <span className="font-semibold text-[var(--color-ink-900)]">
                {phoneTail ? `••• ${phoneTail}` : phone}
              </span>
              .
            </p>
            <Field
              ref={codeRef}
              label="Verification code"
              value={code}
              onChange={(value) => setCode(value.replace(NON_DIGIT_REGEX, "").slice(0, OTP_CODE_LENGTH))}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_CODE_LENGTH}
              isMonospace
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isVerifying}
              trailingIcon={<ArrowRight size={14} />}
              disabled={code.length < OTP_CODE_LENGTH || isVerifying}
            >
              Verify and sign in
            </Button>
            {error && <ErrorMessage message={error} />}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[12px]">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError(null);
                }}
                className="font-semibold text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]"
              >
                Use a different phone
              </button>
              <button
                type="button"
                onClick={() => {
                  if (resendIn > 0) {
                    return;
                  }
                  void requestCode(phone.trim());
                }}
                disabled={resendIn > 0 || isSendingCode}
                className={classNames(
                  "font-semibold",
                  resendIn > 0 || isSendingCode
                    ? "cursor-not-allowed text-[var(--color-ink-400)]"
                    : "text-[var(--color-accent-700)] hover:text-[var(--color-accent-800)]",
                )}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}
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

function ErrorMessage({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-[var(--radius-md)] border border-rose-100 bg-rose-50 p-3 text-[12.5px] text-rose-800">
      {message}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoFocus?: boolean;
  autoComplete?: string;
  maxLength?: number;
  isMonospace?: boolean;
}

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, value, onChange, icon, placeholder, inputMode, autoFocus, autoComplete, maxLength, isMonospace },
  ref,
) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {label}
      </span>
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={classNames(
            "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] text-sm text-[var(--color-ink-900)] transition-colors placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)]/30",
            icon ? "pl-9 pr-3" : "px-3.5",
            isMonospace && "font-mono tracking-[0.4em]",
          )}
        />
      </span>
    </label>
  );
});
