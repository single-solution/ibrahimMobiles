"use client";

import { useState } from "react";
import { Filter, ImagePlus, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/shared/ProductImage";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

interface MediaEntry {
  id: string;
  imageUrl: string;
  brandSlug: string;
  modelName: string;
  altLabel: string;
}

interface MediaLibraryProps {
  mediaEntries: MediaEntry[];
}

export function MediaLibrary({ mediaEntries }: MediaLibraryProps) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MediaEntry | null>(null);

  const filteredEntries = query.trim()
    ? mediaEntries.filter((entry) =>
        `${entry.modelName} ${entry.brandSlug} ${entry.altLabel}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : mediaEntries;

  return (
    <>
      <div className="rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface)] px-5 py-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[var(--color-ink-500)]">
          <ImagePlus size={20} />
        </div>
        <h2 className="mt-3 text-base font-semibold text-[var(--color-ink-900)]">
          Drag-and-drop images here
        </h2>
        <p className="mt-1 text-xs text-[var(--color-ink-500)]">
          PNG, JPG or WebP up to 8 MB · or paste a URL.
        </p>
        <div className="mt-3 flex justify-center">
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Upload size={14} />}
            onClick={() => toast.info("Image uploads are disabled in the demo")}
          >
            Upload images
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <label className="relative flex h-9 max-w-xs flex-1 items-center">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 text-[var(--color-ink-400)]"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search images by model or brand…"
            className="h-full w-full rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] pl-8 pr-3 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-ink-400)] focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-2 text-xs text-[var(--color-ink-500)]">
          <span>{filteredEntries.length} files</span>
          <Button variant="outline" size="sm" leadingIcon={<Filter size={12} />}>
            Filters
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="group relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]"
          >
            <ProductImage
              imageUrl={entry.imageUrl}
              brandName={entry.brandSlug}
              brandSlug={entry.brandSlug}
              modelName={entry.modelName}
              colorName=""
              sizes="200px"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                  {entry.altLabel}
                </p>
                <p className="truncate text-[11px] font-medium text-white">{entry.modelName}</p>
              </div>
              <button
                type="button"
                aria-label="Delete image"
                onClick={() => setDeleteTarget(entry)}
                className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-white/10 text-white hover:bg-rose-500/80"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete this image?"
        message={
          <>
            Image will be removed from the library and any product currently using it. Cannot be
            undone.
          </>
        }
        tone="danger"
        confirmLabel="Delete image"
        onConfirm={() => {
          if (deleteTarget) toast.warn("Image deleted");
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
