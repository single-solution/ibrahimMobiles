"use client";

import { forwardRef, useEffect, useRef, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, Phone as PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { classNames, OTP_CODE_LENGTH } from "@store/shared";

const RESEND_AFTER_SECONDS = 30;
const COUNTDOWN_TICK_MS = 1_000;
const CODE_AUTOFOCUS_DELAY_MS = 80;
const NON_DIGIT_REGEX = /\D/g;

interface IssueOtpResponse {
  phoneTail?: string;
  expiresAt?: string;
  error?: string;
}

export interface PhoneOtpFormProps {
  phoneSubmitLabel: string;
  codeSubmitLabel: string;
  onVerified: () => void;
  phonePlaceholder?: string;
  autoFocusPhone?: boolean;
}

export function PhoneOtpForm({
  phoneSubmitLabel,
  codeSubmitLabel,
  onVerified,
  phonePlaceholder = "+92 300 1234567",
  autoFocusPhone = false,
}: PhoneOtpFormProps) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneTail, setPhoneTail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setResendIn((previous) => Math.max(0, previous - 1));
    }, COUNTDOWN_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [resendIn]);

  async function requestCode(currentPhone: string): Promise<boolean> {
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
    const currentPhone = phone.trim();
    if (!currentPhone) {
      return;
    }
    const issued = await requestCode(currentPhone);
    if (issued) {
      window.setTimeout(() => codeInputRef.current?.focus(), CODE_AUTOFOCUS_DELAY_MS);
    }
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length < OTP_CODE_LENGTH) {
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      const result = await signIn("customer-otp", {
        redirect: false,
        phoneNumber: phone.trim(),
        code,
      });
      if (result?.error) {
        setError("That code didn't match. Please try again.");
        return;
      }
      onVerified();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  if (step === "phone") {
    return (
      <form onSubmit={handlePhoneSubmit} className="space-y-4">
        <OtpField
          label="Phone number"
          value={phone}
          onChange={setPhone}
          placeholder={phonePlaceholder}
          icon={<PhoneIcon size={14} />}
          inputMode="tel"
          autoComplete="tel"
          autoFocus={autoFocusPhone}
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
          {phoneSubmitLabel}
        </Button>
        {error && <OtpFormError message={error} />}
      </form>
    );
  }

  return (
    <form onSubmit={handleCodeSubmit} className="space-y-4">
      <p className="max-w-prose text-[12.5px] text-[var(--color-ink-600)]">
        Enter the {OTP_CODE_LENGTH}-digit code sent to{" "}
        <span className="font-semibold text-[var(--color-ink-900)]">
          {phoneTail ? `••• ${phoneTail}` : phone}
        </span>
        .
      </p>
      <OtpField
        ref={codeInputRef}
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
        {codeSubmitLabel}
      </Button>
      {error && <OtpFormError message={error} />}

      <ResendControls
        resendIn={resendIn}
        isSendingCode={isSendingCode}
        onUseDifferentPhone={() => {
          setStep("phone");
          setCode("");
          setError(null);
        }}
        onResend={() => void requestCode(phone.trim())}
      />
    </form>
  );
}

function ResendControls({
  resendIn,
  isSendingCode,
  onUseDifferentPhone,
  onResend,
}: {
  resendIn: number;
  isSendingCode: boolean;
  onUseDifferentPhone: () => void;
  onResend: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[12px]">
      <button
        type="button"
        onClick={onUseDifferentPhone}
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
          onResend();
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
  );
}

export function OtpFormError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="animate-banner-in rounded-[var(--radius-md)] border border-[var(--color-danger-100)] bg-[var(--color-danger-50)] p-3 text-[12.5px] text-[var(--color-danger-800)]"
    >
      {message}
    </div>
  );
}

interface OtpFieldProps {
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

const OtpField = forwardRef<HTMLInputElement, OtpFieldProps>(function OtpField(
  {
    label,
    value,
    onChange,
    icon,
    placeholder,
    inputMode,
    autoFocus,
    autoComplete,
    maxLength,
    isMonospace,
  },
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
