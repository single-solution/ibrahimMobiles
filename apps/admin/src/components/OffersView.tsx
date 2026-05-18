"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Drawer } from "@/components/Drawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusPill } from "@/components/StatusPill";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { ColorChips } from "@/components/forms/ColorChips";
import { Switch } from "@/components/forms/Switch";
import { useToast } from "@/components/Toast";
import { adminFetch } from "@/lib/adminApi";
import { OFFER_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import { formatRelativeDate, ISO_DATE_LENGTH } from "@store/shared";
import type { AdminOffer } from "@/types/admin";

const OFFER_SLUG_MAX_CHARS = 96;

const ACCENT_SWATCHES: Record<AdminOffer["accentColor"], string> = {
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
};

const ACCENT_OPTIONS = [
  { value: "emerald", label: "Emerald", swatch: ACCENT_SWATCHES.emerald },
  { value: "amber", label: "Amber", swatch: ACCENT_SWATCHES.amber },
  { value: "rose", label: "Rose", swatch: ACCENT_SWATCHES.rose },
  { value: "sky", label: "Sky", swatch: ACCENT_SWATCHES.sky },
];

interface OffersViewProps {
  offers: AdminOffer[];
}

type DrawerState = { mode: "new" } | { mode: "edit"; offer: AdminOffer } | null;

export function OffersView({ offers }: OffersViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [toDelete, setToDelete] = useState<AdminOffer | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleDelete() {
    if (!toDelete) {
      return;
    }
    try {
      await adminFetch(`/api/offers/${toDelete.id}`, { method: "DELETE" });
      toast.warn(`"${toDelete.title}" deleted`);
      setToDelete(null);
      refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to delete offer");
    }
  }

  const columns: DataTableColumn<AdminOffer>[] = [
    {
      id: "title",
      header: "Offer",
      cell: (offer) => (
        <div className="flex items-center gap-3">
          <span
            className="size-9 shrink-0 rounded-[var(--radius-md)]"
            style={{ backgroundColor: ACCENT_SWATCHES[offer.accentColor] }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
                {offer.title}
              </p>
              <StatusPill tone="dark">{offer.badgeLabel}</StatusPill>
              {!offer.isActive ? <StatusPill tone="neutral">Hidden</StatusPill> : null}
            </div>
            <p className="truncate text-[11px] text-[var(--color-ink-500)]">
              /deals#{offer.slug}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "discount",
      header: "Discount",
      hideOnMobile: true,
      cell: (offer) => (
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">
          {offer.discountLabel}
        </span>
      ),
    },
    {
      id: "expires",
      header: "Expires",
      hideOnMobile: true,
      cell: (offer) => (
        <span className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-600)]">
          <CalendarClock size={12} />
          {offer.expiresAt ? formatRelativeDate(offer.expiresAt) : "No expiry"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      width: "100px",
      cell: (offer) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-label="Edit offer"
            onClick={() => setDrawer({ mode: "edit", offer })}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            aria-label="Delete offer"
            onClick={() => setToDelete(offer)}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-rose-500 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        rows={offers}
        columns={columns}
        rowKey={(offer) => offer.id}
        searchAccessor={(offer) => `${offer.title} ${offer.description} ${offer.badgeLabel}`}
        searchPlaceholder="Search offers…"
        toolbar={
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() => setDrawer({ mode: "new" })}
          >
            New offer
          </Button>
        }
      />

      {drawer ? (
        <OfferDrawer
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
        title="Delete offer?"
        message={
          <>
            This will remove <strong>{toDelete?.title}</strong> from the storefront immediately.
          </>
        }
        tone="danger"
        confirmLabel="Delete offer"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

interface OfferDrawerProps {
  state: { mode: "new" } | { mode: "edit"; offer: AdminOffer };
  onClose: () => void;
  onSaved: () => void;
}

function OfferDrawer({ state, onClose, onSaved }: OfferDrawerProps) {
  const toast = useToast();
  const isEdit = state.mode === "edit";
  const initial = isEdit ? state.offer : null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [discountLabel, setDiscountLabel] = useState(initial?.discountLabel ?? "");
  const [badgeLabel, setBadgeLabel] = useState(initial?.badgeLabel ?? "Limited");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [accentColor, setAccentColor] = useState<AdminOffer["accentColor"]>(
    initial?.accentColor ?? "amber",
  );
  const [expiresAt, setExpiresAt] = useState(initial?.expiresAt?.slice(0, ISO_DATE_LENGTH) ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        title,
        slug: slug || undefined,
        discountLabel,
        badgeLabel,
        description,
        accentColor,
        expiresAt: expiresAt || null,
        isActive,
      };
      if (isEdit && initial) {
        await adminFetch(`/api/offers/${initial.id}`, { method: "PUT", json: payload });
        toast.success("Offer updated");
      } else {
        await adminFetch(`/api/offers`, { method: "POST", json: payload });
        toast.success("Offer published");
      }
      onSaved();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to save offer");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={isEdit ? "Edit offer" : "Create offer"}
      width="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="offer-form"
            isLoading={isSaving}
          >
            {isEdit ? "Save changes" : "Publish offer"}
          </Button>
        </div>
      }
    >
      <form id="offer-form" onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={OFFER_FIELD_LIMITS.title}
          placeholder="Eid Bundle"
        />
        <TextField
          label="Slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="eid-bundle"
          hint="Used in /deals#{slug}. Auto-generated from title if blank."
          maxLength={OFFER_SLUG_MAX_CHARS}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Discount label"
            value={discountLabel}
            onChange={(event) => setDiscountLabel(event.target.value)}
            required
            maxLength={OFFER_FIELD_LIMITS.discountLabel}
            placeholder="Up to 22% off"
          />
          <TextField
            label="Badge label"
            value={badgeLabel}
            onChange={(event) => setBadgeLabel(event.target.value)}
            required
            maxLength={OFFER_FIELD_LIMITS.badgeLabel}
            placeholder="Limited"
          />
        </div>
        <TextArea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
          rows={4}
          maxLength={OFFER_FIELD_LIMITS.description}
          placeholder="Buy any Brand-new iPhone and get…"
        />
        <TextField
          label="Expires"
          type="date"
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
        />
        <ColorChips
          label="Accent color"
          value={accentColor}
          onChange={(value) => setAccentColor(value as AdminOffer["accentColor"])}
          options={ACCENT_OPTIONS}
        />
        <Switch
          label="Visible on storefront"
          description="Toggle off to hide this offer from /deals and the homepage."
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </form>
    </Drawer>
  );
}
