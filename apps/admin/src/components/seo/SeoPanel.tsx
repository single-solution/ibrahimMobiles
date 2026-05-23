"use client";

/**
 * The admin SEO panel — a collapsible block mounted at the bottom of
 * every entity editor (Product, Category, Brand, Offer). Captures
 * optional per-entity overrides that the storefront's `composeSeoMeta`
 * will pick up; everything is auto-derived when these fields are blank.
 *
 * Pure controlled component. Parent owns the `SeoMeta` slice of state.
 */

import { useId, useState } from "react";

import { SEO_META_FIELD_LIMITS, type SeoMeta } from "@store/shared";

interface SeoPanelProps {
  value: SeoMeta;
  onChange: (next: SeoMeta) => void;
  /** Compact summary line shown in the header (e.g. "Phone · Apple · iPhone 14"). */
  contextLabel?: string;
  /** 0–100 SEO score badge rendered beside the collapse control. */
  headerExtra?: React.ReactNode;
  /**
   * Optional resolved preview snippet shown above the form. Most editors
   * pass the live `<title>` and `<meta description>` previews here so the
   * admin can verify exactly what the storefront will render.
   */
  previewSlot?: React.ReactNode;
}

function clampLength(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function counterTone(len: number, min: number, max: number): string {
  if (len === 0) return "text-[color:var(--color-ink-400)]";
  if (len < min) return "text-amber-600";
  if (len > max) return "text-rose-600";
  return "text-emerald-600";
}

export function SeoPanel({
  value,
  onChange,
  contextLabel,
  headerExtra,
  previewSlot,
}: SeoPanelProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const set = <K extends keyof SeoMeta>(key: K, next: SeoMeta[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <section
      className="rounded-[var(--radius-lg)] border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface)]"
      aria-labelledby={`${id}-heading`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        aria-controls={`${id}-body`}
      >
        <div className="flex flex-col gap-1">
          <h3
            id={`${id}-heading`}
            className="text-sm font-semibold text-[color:var(--color-ink-900)]"
          >
            SEO
          </h3>
          {contextLabel ? (
            <p className="text-xs text-[color:var(--color-ink-500)]">
              {contextLabel}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          <span className="text-xs text-[color:var(--color-ink-500)]">
            {open ? "Hide" : "Configure"}
          </span>
        </div>
      </button>

      {open ? (
        <div
          id={`${id}-body`}
          className="space-y-4 border-t border-[color:var(--color-ink-100)] px-4 py-4"
        >
          {previewSlot}
          <FieldRow label="Focus keyword" htmlFor={`${id}-focus`}>
            <input
              id={`${id}-focus`}
              type="text"
              value={value.focusKeyword ?? ""}
              onChange={(event) =>
                set(
                  "focusKeyword",
                  clampLength(
                    event.target.value,
                    SEO_META_FIELD_LIMITS.focusKeyword,
                  ),
                )
              }
              placeholder="e.g. iphone 14 pro pakistan"
              maxLength={SEO_META_FIELD_LIMITS.focusKeyword}
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-ink-200)] bg-[color:var(--color-surface)] px-3 py-2 text-sm"
            />
          </FieldRow>

          <FieldRow
            label="Title override"
            htmlFor={`${id}-title`}
            counter={`${(value.title ?? "").length} / 60`}
            counterTone={counterTone(
              (value.title ?? "").length,
              30,
              60,
            )}
          >
            <input
              id={`${id}-title`}
              type="text"
              value={value.title ?? ""}
              onChange={(event) =>
                set(
                  "title",
                  clampLength(
                    event.target.value,
                    SEO_META_FIELD_LIMITS.title,
                  ),
                )
              }
              maxLength={SEO_META_FIELD_LIMITS.title}
              placeholder="Auto-generated if blank"
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-ink-200)] bg-[color:var(--color-surface)] px-3 py-2 text-sm"
            />
          </FieldRow>

          <FieldRow
            label="Description override"
            htmlFor={`${id}-desc`}
            counter={`${(value.description ?? "").length} / 160`}
            counterTone={counterTone(
              (value.description ?? "").length,
              120,
              160,
            )}
          >
            <textarea
              id={`${id}-desc`}
              value={value.description ?? ""}
              rows={3}
              onChange={(event) =>
                set(
                  "description",
                  clampLength(
                    event.target.value,
                    SEO_META_FIELD_LIMITS.description,
                  ),
                )
              }
              maxLength={SEO_META_FIELD_LIMITS.description}
              placeholder="Auto-generated if blank"
              className="w-full resize-y rounded-[var(--radius-md)] border border-[color:var(--color-ink-200)] bg-[color:var(--color-surface)] px-3 py-2 text-sm"
            />
          </FieldRow>

          <FieldRow label="Canonical URL" htmlFor={`${id}-canonical`}>
            <input
              id={`${id}-canonical`}
              type="url"
              value={value.canonicalUrl ?? ""}
              onChange={(event) =>
                set(
                  "canonicalUrl",
                  clampLength(
                    event.target.value,
                    SEO_META_FIELD_LIMITS.canonicalUrl,
                  ),
                )
              }
              maxLength={SEO_META_FIELD_LIMITS.canonicalUrl}
              placeholder="Defaults to the current page URL"
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-ink-200)] bg-[color:var(--color-surface)] px-3 py-2 text-sm"
            />
          </FieldRow>

          <FieldRow label="OG image URL" htmlFor={`${id}-og`}>
            <input
              id={`${id}-og`}
              type="url"
              value={value.ogImageUrl ?? ""}
              onChange={(event) =>
                set(
                  "ogImageUrl",
                  clampLength(
                    event.target.value,
                    SEO_META_FIELD_LIMITS.ogImageUrl,
                  ),
                )
              }
              maxLength={SEO_META_FIELD_LIMITS.ogImageUrl}
              placeholder="Defaults to the auto-generated OG image"
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-ink-200)] bg-[color:var(--color-surface)] px-3 py-2 text-sm"
            />
          </FieldRow>

          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(value.noindex)}
                onChange={(event) => set("noindex", event.target.checked)}
              />
              <span>noindex</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(value.nofollow)}
                onChange={(event) => set("nofollow", event.target.checked)}
              />
              <span>nofollow</span>
            </label>
          </div>
        </div>
      ) : null}
    </section>
  );
}

interface FieldRowProps {
  label: string;
  htmlFor: string;
  counter?: string;
  counterTone?: string;
  children: React.ReactNode;
}

function FieldRow({
  label,
  htmlFor,
  counter,
  counterTone,
  children,
}: FieldRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-ink-500)]"
        >
          {label}
        </label>
        {counter ? (
          <span className={`text-xs ${counterTone ?? ""}`}>{counter}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
