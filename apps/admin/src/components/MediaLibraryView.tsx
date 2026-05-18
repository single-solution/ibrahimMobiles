"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Filter, ImagePlus, Pencil, Search, Trash2, Upload } from "lucide-react";
import { FIELD_LIMITS } from "@store/shared";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/Drawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { useToast } from "@/components/Toast";
import { adminFetch } from "@/lib/adminApi";
import type { AdminMediaAsset } from "@/types/admin";

interface MediaLibraryViewProps {
  assets: AdminMediaAsset[];
}

type DrawerState =
  | { mode: "new" }
  | { mode: "edit"; asset: AdminMediaAsset }
  | null;

export function MediaLibraryView({ assets }: MediaLibraryViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [toDelete, setToDelete] = useState<AdminMediaAsset | null>(null);

  const filtered = query.trim()
    ? assets.filter((asset) =>
        `${asset.title} ${asset.tags.join(" ")} ${asset.fileName ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : assets;

  function refresh() {
    router.refresh();
  }

  async function handleDelete() {
    if (!toDelete) {
      return;
    }
    try {
      await adminFetch(`/api/media/${toDelete.id}`, { method: "DELETE" });
      toast.warn(`"${toDelete.title}" deleted`);
      setToDelete(null);
      refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to delete asset");
    }
  }

  return (
    <>
      <div className="rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface)] px-5 py-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[var(--color-ink-500)]">
          <ImagePlus size={20} />
        </div>
        <h2 className="mt-3 text-base font-semibold text-[var(--color-ink-900)]">
          Add media by URL
        </h2>
        <p className="mt-1 text-xs text-[var(--color-ink-500)]">
          Paste a public CDN URL — the library stores the link, your CDN serves the bytes.
        </p>
        <div className="mt-3 flex justify-center">
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Upload size={14} />}
            onClick={() => setDrawer({ mode: "new" })}
          >
            Add media
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
            placeholder="Search by title, tag or file…"
            className="h-full w-full rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] pl-8 pr-3 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-100)]"
          />
        </label>
        <div className="flex items-center gap-2 text-xs text-[var(--color-ink-500)]">
          <span>{filtered.length} files</span>
          <Button variant="outline" size="sm" leadingIcon={<Filter size={12} />} disabled>
            Filters
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-ink-500)]">
            No media yet. Click <strong>Add media</strong> to upload your first asset.
          </div>
        ) : (
          filtered.map((asset) => (
            <div
              key={asset.id}
              className="group relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]"
            >
              {asset.kind === "image" ? (
                <Image
                  src={asset.url}
                  alt={asset.alt ?? asset.title}
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="grid h-full place-items-center text-xs uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                  {asset.kind}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
                    {asset.kind}
                  </p>
                  <p className="truncate text-[11px] font-medium text-white">{asset.title}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Edit asset"
                    onClick={() => setDrawer({ mode: "edit", asset })}
                    className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-white/10 text-white hover:bg-white/20"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete asset"
                    onClick={() => setToDelete(asset)}
                    className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-white/10 text-white hover:bg-rose-500/80"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {drawer ? (
        <MediaDrawer
          state={drawer}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            setDrawer(null);
            refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        isOpen={toDelete !== null}
        title="Delete this asset?"
        message={
          <>
            <strong>{toDelete?.title}</strong> will be removed from the library. Existing usages
            already pinned by URL will continue to work.
          </>
        }
        tone="danger"
        confirmLabel="Delete asset"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

interface MediaDrawerProps {
  state: { mode: "new" } | { mode: "edit"; asset: AdminMediaAsset };
  onClose: () => void;
  onSaved: () => void;
}

function MediaDrawer({ state, onClose, onSaved }: MediaDrawerProps) {
  const toast = useToast();
  const isEdit = state.mode === "edit";
  const initial = isEdit ? state.asset : null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [alt, setAlt] = useState(initial?.alt ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const tagList = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      if (isEdit && initial) {
        await adminFetch(`/api/media/${initial.id}`, {
          method: "PUT",
          json: { title, alt: alt || undefined, tags: tagList },
        });
        toast.success("Media updated");
      } else {
        await adminFetch(`/api/media`, {
          method: "POST",
          json: { title, url, alt: alt || undefined, tags: tagList, kind: "image" },
        });
        toast.success("Media added");
      }
      onSaved();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to save asset");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={isEdit ? "Edit media" : "Add media"}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="media-form"
            isLoading={isSaving}
          >
            {isEdit ? "Save changes" : "Add media"}
          </Button>
        </div>
      }
    >
      <form id="media-form" onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={FIELD_LIMITS.mediumText}
        />
        {!isEdit ? (
          <TextField
            label="URL"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
            placeholder="https://cdn.example.com/photo.jpg"
            maxLength={FIELD_LIMITS.mediaUrl}
          />
        ) : null}
        <TextField
          label="Alt text"
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
          maxLength={FIELD_LIMITS.imageAlt}
          hint="Describe the image for accessibility."
        />
        <TextArea
          label="Tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          rows={2}
          hint="Comma-separated tags."
        />
      </form>
    </Drawer>
  );
}
