"use client";

import type { ReactNode } from "react";

/** Shared chrome for every preset preview — same layout, different motion. */
export function MotionLabShell({
  eyebrow,
  children,
  footer,
}: {
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-[min(520px,70dvh)] flex-col items-center justify-center overflow-hidden px-6 py-14 text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-accent-50) 85%, #fff) 0%, var(--color-canvas) 100%)",
        }}
      />
      {eyebrow ? (
        <p className="relative z-10 mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-800)]">
          {eyebrow}
        </p>
      ) : null}
      <div className="relative z-10 w-full max-w-3xl">{children}</div>
      {footer ? (
        <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/** Fake phone tiles for presets that need a product fan. */
export function MotionLabPhoneFan({ className = "" }: { className?: string }) {
  return (
    <div
      className={`mx-auto grid max-w-md grid-cols-3 gap-2 ${className}`.trim()}
      aria-hidden
    >
      {[0, 1, 2].map((slot) => (
        <div
          key={slot}
          className={`aspect-square rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-gradient-to-br from-[var(--color-canvas-deep)] to-[var(--color-surface)] shadow-[var(--shadow-sm)] ${
            slot === 1 ? "scale-105 shadow-[var(--shadow-md)]" : "opacity-80"
          }`}
        />
      ))}
    </div>
  );
}
