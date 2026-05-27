"use client";

/**
 * Single-file video input. Used for `Grade.video`.
 *
 * Persistence contract: parent owns the URL string. We POST to
 * `/api/uploads?kind=video` to get back the URL of the original file
 * (no transcoding) and pass it through `onChange`.
 */

import { useId, useRef, useState } from "react";
import { Film, RefreshCcw, Trash2 } from "lucide-react";

import { removeStoredUrls, uploadVideo } from "./uploadClient";

interface VideoUploadProps {
  value: string;
  onChange: (url: string) => void;
  subjectKind?: string;
  subjectId?: string;
  label?: string;
  hint?: string;
}

export function VideoUpload({
  value,
  onChange,
  subjectKind,
  subjectId,
  label,
  hint,
}: VideoUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const result = await uploadVideo({ file, subjectKind, subjectId });
      if (value) {
        await removeStoredUrls([value]);
      }
      onChange(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!value) return;
    setBusy(true);
    try {
      await removeStoredUrls([value]);
      onChange("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]"
        >
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="video/mp4,video/webm"
        className="sr-only"
        disabled={busy}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {value ? (
        <div className="rounded-lg border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3">
          <video
            src={value}
            controls
            playsInline
            preload="metadata"
            className="w-full rounded-md bg-black"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--color-ink-800)] hover:bg-[var(--color-canvas-deep)] disabled:opacity-60"
            >
              <RefreshCcw size={12} /> Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-rose-200)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--color-rose-700)] hover:bg-[var(--color-rose-50)] disabled:opacity-60"
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] p-6 text-[var(--color-ink-500)] hover:border-[var(--color-accent-400)] hover:text-[var(--color-accent-700)] disabled:opacity-60"
        >
          <Film size={20} />
          <span className="text-[12.5px] font-semibold">
            {busy ? "Uploading…" : "Upload video"}
          </span>
          {hint && <span className="text-[11px]">{hint}</span>}
        </button>
      )}
      {error && (
        <p className="text-[12px] text-[var(--color-rose-700)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
