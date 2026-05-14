"use client";

import { Camera, PlayCircle, Sparkles, ShieldCheck, Wrench } from "lucide-react";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { useSelectedVariantId } from "@/components/shared/VariantContext";
import { gradeDescriptors } from "@/data/grades";
import type { ConditionGrade, Phone } from "@/types";

interface GradeShowcaseProps {
  phone: Phone;
  variant?: "mobile" | "desktop";
}

const GRADE_ACCENT: Record<ConditionGrade, { bg: string; text: string; bar: string }> = {
  "A+": {
    bg: "bg-[var(--color-grade-aplus)]/10",
    text: "text-[var(--color-grade-aplus)]",
    bar: "bg-[var(--color-grade-aplus)]",
  },
  A: {
    bg: "bg-[var(--color-grade-a)]/10",
    text: "text-[var(--color-grade-a)]",
    bar: "bg-[var(--color-grade-a)]",
  },
  B: {
    bg: "bg-[var(--color-grade-b)]/10",
    text: "text-[var(--color-grade-b)]",
    bar: "bg-[var(--color-grade-b)]",
  },
  C: {
    bg: "bg-[var(--color-grade-c)]/10",
    text: "text-[var(--color-grade-c)]",
    bar: "bg-[var(--color-grade-c)]",
  },
};

const GRADE_FILL: Record<ConditionGrade, number> = {
  "A+": 100,
  A: 85,
  B: 65,
  C: 45,
};

export function GradeShowcase({ phone, variant = "desktop" }: GradeShowcaseProps) {
  const selectedVariantId = useSelectedVariantId();
  const selected =
    phone.variants.find((v) => v.id === selectedVariantId) ?? phone.variants[0];
  const descriptor =
    gradeDescriptors.find((d) => d.grade === selected.grade) ?? gradeDescriptors[0];
  const accent = GRADE_ACCENT[selected.grade];

  if (variant === "mobile") {
    return (
      <section className="app-section">
        <div className="app-section-eyebrow">
          <span>Grade {selected.grade}</span>
          <span className="lowercase tracking-normal text-[var(--color-ink-500)]">
            {descriptor.shortLabel}
          </span>
        </div>
        <div className="overflow-hidden rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
          <VideoFrame grade={selected.grade} accent={accent} compact />
          <div className="space-y-3 p-3.5">
            <p className="text-[13px] leading-snug text-[var(--color-ink-700)]">
              {descriptor.description}
            </p>
            <div className="space-y-2">
              <GradeBullet
                icon={<Sparkles size={13} />}
                title="Cosmetic condition"
                body={descriptor.cosmeticNotes}
              />
              <GradeBullet
                icon={<Wrench size={13} />}
                title="Functional condition"
                body={descriptor.functionalNotes}
              />
              <GradeBullet
                icon={<ShieldCheck size={13} />}
                title="Warranty on this unit"
                body={`${selected.warrantyMonths}-month warranty · 15-day moneyback guarantee.`}
              />
            </div>
            <GradeMeter grade={selected.grade} accent={accent} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-16 grid grid-cols-[1fr_1.1fr] gap-8 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-8">
      <VideoFrame grade={selected.grade} accent={accent} />
      <div>
        <div className="flex items-center gap-3">
          <GradeBadge grade={selected.grade} size="md" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-500)]">
              Selected grade
            </p>
            <p className="text-2xl font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
              {descriptor.shortLabel}
            </p>
          </div>
        </div>
        <p className="mt-4 text-base leading-relaxed text-[var(--color-ink-700)]">
          {descriptor.description}
        </p>
        <div className="mt-5 grid grid-cols-1 gap-2.5">
          <GradeBullet
            icon={<Sparkles size={14} />}
            title="Cosmetic condition"
            body={descriptor.cosmeticNotes}
          />
          <GradeBullet
            icon={<Wrench size={14} />}
            title="Functional condition"
            body={descriptor.functionalNotes}
          />
          <GradeBullet
            icon={<ShieldCheck size={14} />}
            title="Warranty on this unit"
            body={`${selected.warrantyMonths}-month warranty · 15-day moneyback guarantee.`}
          />
        </div>
        <GradeMeter grade={selected.grade} accent={accent} className="mt-5" />
      </div>
    </section>
  );
}

interface VideoFrameProps {
  grade: ConditionGrade;
  accent: (typeof GRADE_ACCENT)[ConditionGrade];
  compact?: boolean;
}

function VideoFrame({ grade, accent, compact }: VideoFrameProps) {
  return (
    <div
      className={`relative overflow-hidden bg-[var(--color-ink-900)] ${
        compact ? "aspect-video w-full" : "aspect-[4/3] rounded-[var(--radius-lg)]"
      }`}
    >
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
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white ${accent.bar}`}>
            Grade {grade}
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
          <PlayCircle size={compact ? 32 : 44} strokeWidth={1.6} />
        </button>
      </div>
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

interface GradeMeterProps {
  grade: ConditionGrade;
  accent: (typeof GRADE_ACCENT)[ConditionGrade];
  className?: string;
}

function GradeMeter({ grade, accent, className }: GradeMeterProps) {
  const fill = GRADE_FILL[grade];
  const labels: ConditionGrade[] = ["C", "B", "A", "A+"];
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
        <span>Condition meter</span>
        <span className={accent.text}>{fill}%</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--color-ink-100)]">
        <div
          className={`h-full rounded-full transition-all ${accent.bar}`}
          style={{ width: `${fill}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-[var(--color-ink-400)]">
        {labels.map((label) => (
          <span key={label} className={label === grade ? `font-semibold ${accent.text}` : undefined}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
