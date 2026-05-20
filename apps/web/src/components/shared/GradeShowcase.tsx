"use client";

import { Camera, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";

import type { Product } from "@store/shared";

import { GradeBadge } from "@/components/shared/GradeBadge";
import { useSelectedVariantId } from "@/components/shared/VariantContext";
import { useGrade } from "@/lib/storefront/storefrontReferenceContext";

/**
 * Per-grade detail strip beneath a product's variants.
 *
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - Grades are now single-`notes` long-text (admin collapsed
 *     `cosmeticNotes` + `functionalNotes` into one field per the user's
 *     simplification pass), so the panel surfaces `notes` and the
 *     selected variant's warranty.
 *   - Accent colour comes from `Grade.color` (hex) — no hardcoded CSS
 *     vars per grade slug.
 *   - The inspection video preview reuses `Grade.video` when admin has
 *     uploaded one; otherwise the synthesized "REC" frame is shown.
 */
interface GradeShowcaseProps {
  product: Product;
  variant?: "mobile" | "desktop";
}

export function GradeShowcase({ product, variant = "desktop" }: GradeShowcaseProps) {
  const selectedVariantId = useSelectedVariantId();
  const variants = product.variants;
  const selected =
    variants.find((candidate) => candidate.id === selectedVariantId) ??
    variants[0];
  const descriptor = useGrade(
    product.categorySlug,
    selected?.gradeSlug ?? "",
  );

  if (!selected || !descriptor) {
    return null;
  }

  const accentColor = descriptor.color || "#1f2937";
  const accentSoftBackground = `${hexToRgba(accentColor, 0.1)}`;

  if (variant === "mobile") {
    return (
      <section className="app-section">
        <div className="app-section-eyebrow">
          <span>Grade · {descriptor.label}</span>
        </div>
        <div className="overflow-hidden rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
          <VideoFrame
            label={descriptor.label}
            accentColor={accentColor}
            videoUrl={descriptor.video}
            isCompact
          />
          <div
            className="space-y-3 p-3.5"
            style={{ backgroundColor: accentSoftBackground }}
          >
            <p className="text-[13px] leading-snug text-[var(--color-ink-700)]">
              {descriptor.notes}
            </p>
            <GradeBullet
              icon={<ShieldCheck size={13} />}
              title="Warranty on this unit"
              body={`${selected.warrantyMonths ?? 0}-month warranty · 15-day moneyback guarantee.`}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-16 grid grid-cols-[1fr_1.1fr] gap-8 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-8">
      <VideoFrame
        label={descriptor.label}
        accentColor={accentColor}
        videoUrl={descriptor.video}
      />
      <div>
        <div className="flex items-center gap-3">
          <GradeBadge
            categorySlug={product.categorySlug}
            gradeSlug={selected.gradeSlug}
            size="md"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-500)]">
              Selected grade
            </p>
            <p className="text-2xl font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
              {descriptor.label}
            </p>
          </div>
        </div>
        <p className="mt-4 text-base leading-relaxed text-[var(--color-ink-700)]">
          {descriptor.notes}
        </p>
        <div className="mt-5 grid grid-cols-1 gap-2.5">
          <GradeBullet
            icon={<Sparkles size={14} />}
            title="What this grade means"
            body={descriptor.notes}
          />
          <GradeBullet
            icon={<ShieldCheck size={14} />}
            title="Warranty on this unit"
            body={`${selected.warrantyMonths ?? 0}-month warranty · 15-day moneyback guarantee.`}
          />
        </div>
      </div>
    </section>
  );
}

interface VideoFrameProps {
  label: string;
  accentColor: string;
  videoUrl?: string;
  isCompact?: boolean;
}

function VideoFrame({ label, accentColor, videoUrl, isCompact }: VideoFrameProps) {
  return (
    <div
      className={`relative overflow-hidden bg-[var(--color-ink-900)] ${
        isCompact ? "aspect-video w-full" : "aspect-[4/3] rounded-[var(--radius-lg)]"
      }`}
    >
      {videoUrl ? (
        <video
          src={videoUrl}
          controls
          preload="none"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <>
          <div
            aria-hidden
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 55%), radial-gradient(circle at 70% 70%, rgba(255,255,255,0.08), transparent 55%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 14px), linear-gradient(45deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 14px)",
            }}
          />
          <div className="absolute inset-0 flex flex-col justify-between p-4 text-white">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur">
                <Camera size={11} />
                Sample inspection
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
                style={{ backgroundColor: accentColor }}
              >
                {label}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-white/70">
                <span className="size-1.5 animate-pulse rounded-full bg-rose-400" />
                REC · 00:14
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                Hall Road · Lab
              </span>
            </div>
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <button
              type="button"
              aria-label="Play sample inspection video"
              className="grid place-items-center rounded-full bg-white/15 p-3 text-white backdrop-blur transition hover:bg-white/25"
            >
              <PlayCircle size={isCompact ? 32 : 44} strokeWidth={1.6} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface GradeBulletProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}

function GradeBullet({ icon, title, body }: GradeBulletProps) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] p-3">
      <span className="mt-0.5 text-[var(--color-accent-700)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--color-ink-900)]">{title}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-ink-600)]">{body}</p>
      </div>
    </div>
  );
}

/** Convert `#rrggbb` to `rgba(r,g,b,a)` for soft background tints. */
function hexToRgba(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) {
    return `rgba(31,41,55,${alpha})`;
  }
  const num = Number.parseInt(match[1], 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}
