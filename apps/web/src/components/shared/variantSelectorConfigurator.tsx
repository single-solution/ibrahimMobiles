"use client";

import { MessageCircle, Settings2 } from "lucide-react";

import { buildWhatsAppLink, classNames } from "@store/shared";
import type { Variant } from "@store/shared";

import { useStoreSettings } from "@/lib/core/storeSettingsContext";

import {
  computeOptionState,
  type Dimension,
} from "./variantSelectorDimensions";

interface ConfiguratorProps {
  dimensions: Dimension[];
  variants: Variant[];
  currentSelection: Record<string, string>;
  onPick: (dimensionKey: string, optionKey: string) => void;
}

export function Configurator({
  dimensions,
  variants,
  currentSelection,
  onPick,
}: ConfiguratorProps) {
  if (dimensions.length === 0) {
    return null;
  }
  return (
    <section
      aria-label="Build your configuration"
      className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
    >
      <header className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/55 px-2.5 py-2 md:px-3 md:py-2.5">
        <div className="flex items-center gap-1.5">
          <Settings2
            size={14}
            className="shrink-0 text-[var(--color-accent-700)]"
            aria-hidden
          />
          <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-ink-900)] md:text-sm">
            Build your configuration
          </h2>
        </div>
      </header>
      <div className="divide-y divide-[var(--color-ink-100)]">
        {dimensions.map((dimension, index) => (
          <DimensionRow
            key={dimension.key}
            dimension={dimension}
            variants={variants}
            currentSelection={currentSelection}
            onPick={onPick}
            isFirst={index === 0}
          />
        ))}
      </div>
    </section>
  );
}

interface DimensionRowProps {
  dimension: Dimension;
  variants: Variant[];
  currentSelection: Record<string, string>;
  onPick: (dimensionKey: string, optionKey: string) => void;
  isFirst?: boolean;
}

function DimensionRow({
  dimension,
  variants,
  currentSelection,
  onPick,
  isFirst = false,
}: DimensionRowProps) {
  return (
    <div
      className={classNames(
        "flex flex-col gap-1.5 px-2.5 pb-2 pt-0 md:px-3 md:pb-2.5 md:pt-0",
        isFirst && "pt-2 md:pt-2.5",
      )}
    >
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-500)] md:text-[10.5px]">
        {dimension.label}
      </span>

      <DimensionTabRow
        dimension={dimension}
        variants={variants}
        currentSelection={currentSelection}
        onPick={onPick}
        trackAvailability={!dimension.isGrade}
      />
    </div>
  );
}

interface DimensionTabRowProps extends DimensionRowProps {
  /** When true, options incompatible with the current pick are styled as unavailable. */
  trackAvailability: boolean;
}

function DimensionTabRow({
  dimension,
  variants,
  currentSelection,
  onPick,
  trackAvailability,
}: DimensionTabRowProps) {
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-200)]"
      role="tablist"
      aria-label={dimension.label}
    >
      <div className="-ml-px -mt-px flex flex-wrap md:m-0 md:flex-nowrap md:divide-x md:divide-[var(--color-ink-200)]">
        {dimension.options.map((option) => {
          const isSelected = currentSelection[dimension.key] === option.key;
          const state = trackAvailability
            ? computeOptionState(
                dimension.key,
                option.key,
                variants,
                currentSelection,
              )
            : "available";
          const isUnavailable = state === "unavailable" && !isSelected;

          return (
            <button
              key={option.key}
              type="button"
              role="tab"
              onClick={() => onPick(dimension.key, option.key)}
              aria-selected={isSelected}
              data-state={trackAvailability ? state : undefined}
              title={
                isUnavailable
                  ? "Not stocked with current pick — auto-switches"
                  : undefined
              }
              className={classNames(
                "flex grow basis-[31%] items-center justify-center whitespace-nowrap border-l border-t border-[var(--color-ink-200)] px-1.5 py-1.5 text-center text-[10px] font-medium leading-snug transition-all md:basis-0 md:flex-1 md:border-0 md:px-2 md:py-2 md:text-[11px]",
                isSelected &&
                  "rounded-[var(--radius-sm)] bg-[var(--color-accent-50)] font-semibold text-[var(--color-accent-800)] shadow-[var(--shadow-sm)] ring-1 ring-inset ring-[var(--color-accent-500)]",
                !isSelected &&
                  !isUnavailable &&
                  "bg-[var(--color-surface)] text-[var(--color-ink-800)] hover:bg-[var(--color-accent-50)] hover:text-[var(--color-accent-800)]",
                isUnavailable &&
                  "bg-[var(--color-canvas-deep)]/40 text-[var(--color-ink-400)] line-through decoration-[var(--color-ink-300)] decoration-1 opacity-50 hover:bg-[var(--color-canvas-deep)]/55 hover:text-[var(--color-ink-500)]",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────── Closest-match notice ─────────────────────── */

export function ClosestMatchNotice({
  brandName,
  productName,
  summary,
  whatsappMessage,
}: {
  brandName: string;
  productName: string;
  summary: string;
  whatsappMessage: string;
}) {
  const { whatsappNumber } = useStoreSettings();
  return (
    <div
      role="status"
      className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-accent-200)] bg-[var(--color-accent-50)] px-2.5 py-2 text-[11px] text-[var(--color-accent-800)] sm:flex-row sm:items-center sm:justify-between md:text-[12px]"
    >
      <div className="min-w-0">
        <p className="font-semibold leading-tight">Closest match shown</p>
        <p className="mt-0.5 max-w-prose leading-snug">
          We don&apos;t stock this exact combination right now — message us and
          we&apos;ll source it.
          <span className="sr-only">
            {brandName} {productName}
            {summary ? ` (${summary})` : ""}
          </span>
        </p>
      </div>
      <a
        href={buildWhatsAppLink(whatsappMessage, whatsappNumber)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-whatsapp)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-on-dark)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-whatsapp-dark)] md:text-[12px]"
      >
        <MessageCircle size={12} className="fill-[var(--color-on-dark)]" />
        Ask on WhatsApp
      </a>
    </div>
  );
}
