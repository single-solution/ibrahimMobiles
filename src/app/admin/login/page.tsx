"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/admin/forms/TextField";
import { ADMIN_SESSION_KEY } from "@/components/admin/adminSession";
import { SITE_NAME } from "@/lib/constants";

export default function AdminLoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
    setTimeout(() => router.push("/admin"), 300);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-canvas-deep)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3">
          <span className="grid size-12 place-items-center rounded-[var(--radius-lg)] bg-[var(--color-accent-700)] text-white shadow-[var(--shadow-sm)]">
            <ShoppingBag size={20} strokeWidth={2.4} />
          </span>
          <div className="text-center leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ink-500)]">
              Admin console
            </p>
            <p className="mt-1 text-base font-semibold tracking-tight text-[var(--color-ink-900)]">
              {SITE_NAME}
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-sm)]">
          <h1 className="text-center text-xl font-semibold tracking-[-0.02em] text-[var(--color-ink-900)]">
            Sign in
          </h1>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <TextField
              label="Email"
              type="email"
              defaultValue="ibrahim@ibrahimmobiles.pk"
              leadingIcon={<Mail size={14} />}
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              defaultValue="••••••••"
              leadingIcon={<Lock size={14} />}
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-xs text-[var(--color-ink-600)]">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked
                  className="size-3.5 rounded border-[var(--color-ink-300)]"
                />
                Remember me
              </label>
              <a href="#" className="font-semibold text-[var(--color-accent-700)] hover:underline">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
              trailingIcon={!isSubmitting ? <ArrowRight size={14} /> : undefined}
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-[var(--color-ink-400)]">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </div>
    </div>
  );
}
