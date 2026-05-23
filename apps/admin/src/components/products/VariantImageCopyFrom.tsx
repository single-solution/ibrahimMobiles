"use client";

import { useEffect, useMemo, useState } from "react";
import { Images } from "lucide-react";

import { cloneImageDrafts, type ImageDraft } from "@/components/uploads/imageDraft";

export interface VariantImageSource {
  uid: string;
  label: string;
  images: ImageDraft[];
}

interface VariantImageCopyFromProps {
  currentUid: string;
  sources: VariantImageSource[];
  onApply: (images: ImageDraft[]) => void;
}

/**
 * Lets admins reuse the same gallery on another variant in the same grade
 * (no re-upload — copies StoredImage refs or pending drafts in memory).
 */
export function VariantImageCopyFrom({
  currentUid,
  sources,
  onApply,
}: VariantImageCopyFromProps) {
  const candidates = useMemo(
    () =>
      sources.filter(
        (row) => row.uid !== currentUid && row.images.length > 0,
      ),
    [currentUid, sources],
  );

  const [sourceUid, setSourceUid] = useState("");

  useEffect(() => {
    if (candidates.length === 0) {
      return;
    }
    if (!candidates.some((row) => row.uid === sourceUid)) {
      setSourceUid(candidates[0].uid);
    }
  }, [candidates, sourceUid]);

  const picked =
    candidates.find((row) => row.uid === sourceUid) ?? candidates[0];

  if (candidates.length === 0 || !picked) {
    return null;
  }

  return (
    <div className="mb-2 flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/50 px-2.5 py-2">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        Same photos as another variant
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={picked.uid}
          onChange={(event) => setSourceUid(event.target.value)}
          className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2 py-1 text-[11.5px] font-medium text-[var(--color-ink-800)] focus:border-[var(--color-accent-500)] focus:outline-none"
          aria-label="Variant to copy images from"
        >
          {candidates.map((row) => (
            <option key={row.uid} value={row.uid}>
              {row.label} ({row.images.length}{" "}
              {row.images.length === 1 ? "photo" : "photos"})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onApply(cloneImageDrafts(picked.images))}
          className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--color-ink-800)] transition hover:border-[var(--color-accent-500)] hover:bg-[var(--color-accent-50)] hover:text-[var(--color-accent-800)]"
        >
          <Images size={12} aria-hidden />
          Use these images
        </button>
      </div>
    </div>
  );
}
