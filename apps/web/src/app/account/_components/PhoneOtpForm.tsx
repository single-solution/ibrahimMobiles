"use client";

import { forwardRef, useEffect, useRef, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, Phone as PhoneIcon } from "lucide-react";
import { Button } from "@store/ui";
import { Input } from "@/components/ui/Input";
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
      const response = await fetch("/api/auth/otp", {
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
      setError(`Please enter the full ${OTP_CODE_LENGTH}-digit code.`);
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
      <form onSubmit={handlePhoneSubmit} className="reveal-stagger space-y-4">
        <div className="reveal">
          <Input
            label="WhatsApp number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={phonePlaceholder}
            icon={<PhoneIcon size={14} />}
            inputMode="tel"
            autoComplete="tel"
            autoFocus={autoFocusPhone}
            error={error}
            isLoading={isSendingCode}
          />
        </div>
        <div className="reveal">
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
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleCodeSubmit} className="reveal-stagger space-y-4">
      <p className="reveal max-w-prose text-[12.5px] text-[var(--color-ink-600)]">
        Enter the {OTP_CODE_LENGTH}-digit code sent to{" "}
        <span className="font-semibold text-[var(--color-ink-900)]">
          {phoneTail ? `••• ${phoneTail}` : phone}
        </span>
        .
      </p>
      <div className="reveal">
        <Input
          ref={codeInputRef}
          label="Verification code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(NON_DIGIT_REGEX, "").slice(0, OTP_CODE_LENGTH))}
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={OTP_CODE_LENGTH}
          isMonospace
          error={error}
          isLoading={isVerifying}
        />
      </div>
      <div className="reveal">
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
      </div>

      <div className="reveal">
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
      </div>
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
        className="tap font-semibold text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]"
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
          "tap font-semibold",
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


