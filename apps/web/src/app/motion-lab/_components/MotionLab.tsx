"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowLeft, Check, Sparkles } from "lucide-react";

import { MOTION_LAB_STORAGE_KEY } from "@/lib/motion/presets";

import { MotionLabPreview } from "./MotionLabPreview";
import { getPresetMeta, MOTION_PRESETS } from "./presetRegistry";

const STYLE_LABELS: Record<string, string> = {
  "scroll-cinematic": "Scroll cinematic",
  "kinetic-type": "Kinetic type",
  geometric: "Geometric",
};

function readSavedPresetId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(MOTION_LAB_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function MotionLab() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(readSavedPresetId);

  const pickPreset = useCallback((id: string) => {
    try {
      window.localStorage.setItem(MOTION_LAB_STORAGE_KEY, id);
      setSavedId(id);
    } catch {
      setSavedId(id);
    }
  }, []);

  const activeMeta = activeId ? getPresetMeta(activeId) : null;

  if (activeId && activeMeta) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)]/95 px-4 py-3 backdrop-blur-md md:px-6">
          <button
            type="button"
            onClick={() => setActiveId(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-700)] hover:text-[var(--color-ink-900)]"
          >
            <ArrowLeft size={16} />
            All directions
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-ink-900)]">
              {activeMeta.name}
            </span>
            <button
              type="button"
              onClick={() => pickPreset(activeId)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--color-accent-500)] px-4 text-[13px] font-semibold text-[var(--color-ink-900)] hover:bg-[var(--color-accent-600)]"
            >
              {savedId === activeId ? (
                <>
                  <Check size={14} />
                  Selected
                </>
              ) : (
                "Pick this direction"
              )}
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-b-[var(--radius-xl)] border border-t-0 border-[var(--color-ink-100)] bg-[var(--color-canvas)]">
          <MotionLabPreview key={activeId} presetId={activeId} />
        </div>
        <p className="px-4 py-4 text-center text-[12px] text-[var(--color-ink-500)] md:px-6">
          Scroll inside the preview if the preset uses scroll (diagram / story).
          Pick your favourite, then tell us — we&apos;ll apply that language
          across the whole storefront.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-10 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-100)]/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-800)]">
          <Sparkles size={12} />
          Motion lab
        </p>
        <h1 className="font-headline mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink-900)] md:text-4xl">
          Try every direction. Pick one winner.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-[var(--color-ink-600)]">
          Six combinations of scroll cinematic, kinetic typography, and
          geometric motion. Preview each live, choose your favourite, then we
          roll that same language across homepage, shop, product, and checkout.
        </p>
        {savedId ? (
          <p className="mt-4 text-[13px] font-medium text-[var(--color-accent-800)]">
            Your current pick:{" "}
            <span className="text-[var(--color-ink-900)]">
              {getPresetMeta(savedId)?.name ?? savedId}
            </span>
            {" · "}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => setActiveId(savedId)}
            >
              Re-open preview
            </button>
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOTION_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setActiveId(preset.id)}
            className={`group flex flex-col rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-5 text-left transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--color-accent-300)] hover:shadow-[var(--shadow-md)] ${
              savedId === preset.id
                ? "border-[var(--color-accent-400)] ring-2 ring-[var(--color-accent-200)]"
                : "border-[var(--color-ink-100)]"
            }`}
          >
            <div className="mb-3 flex flex-wrap gap-1.5">
              {preset.styles.map((style) => (
                <span
                  key={style}
                  className="rounded-full bg-[var(--color-canvas-deep)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-ink-600)]"
                >
                  {STYLE_LABELS[style] ?? style}
                </span>
              ))}
              {preset.id === "hybrid-premium" ? (
                <span className="rounded-full bg-[var(--color-accent-100)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-accent-800)]">
                  Recommended
                </span>
              ) : null}
            </div>
            <h2 className="text-[17px] font-semibold text-[var(--color-ink-900)]">
              {preset.name}
            </h2>
            <p className="mt-1.5 flex-1 text-[12.5px] leading-snug text-[var(--color-ink-500)]">
              {preset.tagline}
            </p>
            <p className="mt-3 text-[11px] text-[var(--color-ink-400)]">
              Best for: {preset.bestFor}
            </p>
            <span className="mt-4 text-[12px] font-semibold text-[var(--color-accent-700)] group-hover:text-[var(--color-ink-900)]">
              Preview live →
            </span>
          </button>
        ))}
      </div>

      <p className="mt-10 text-center text-[12px] text-[var(--color-ink-500)]">
        Done choosing?{" "}
        <Link href="/" className="font-medium text-[var(--color-ink-800)] underline">
          Back to storefront
        </Link>
        {" · "}
        Tell us your pick in chat and we&apos;ll implement site-wide.
      </p>
    </div>
  );
}
