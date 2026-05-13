"use client";

import { useState } from "react";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Drawer } from "@/components/admin/Drawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatusPill } from "@/components/admin/StatusPill";
import { TextField } from "@/components/admin/forms/TextField";
import { TextArea } from "@/components/admin/forms/TextArea";
import { ColorChips } from "@/components/admin/forms/ColorChips";
import { Switch } from "@/components/admin/forms/Switch";
import { useToast } from "@/components/admin/Toast";
import type { Offer } from "@/types";
import { formatRelativeDate } from "@/lib/utils";

interface OffersTableProps {
  offers: Offer[];
}

const ACCENT_SWATCHES: Record<Offer["accentColor"], string> = {
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

export function OffersTable({ offers }: OffersTableProps) {
  const toast = useToast();
  const [editingOffer, setEditingOffer] = useState<Offer | "new" | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);

  const columns: DataTableColumn<Offer>[] = [
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
          {formatRelativeDate(offer.expiresAt)}
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
            onClick={() => setEditingOffer(offer)}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            aria-label="Delete offer"
            onClick={() => setOfferToDelete(offer)}
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
            onClick={() => setEditingOffer("new")}
          >
            New offer
          </Button>
        }
      />

      <Drawer
        isOpen={editingOffer !== null}
        onClose={() => setEditingOffer(null)}
        title={editingOffer === "new" ? "Create offer" : "Edit offer"}
        width="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditingOffer(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={() => {
                toast.success(editingOffer === "new" ? "Offer published" : "Offer updated");
                setEditingOffer(null);
              }}
            >
              {editingOffer === "new" ? "Publish offer" : "Save changes"}
            </Button>
          </div>
        }
      >
        <OfferForm offer={typeof editingOffer === "object" ? editingOffer : null} />
      </Drawer>

      <ConfirmDialog
        isOpen={offerToDelete !== null}
        title="Delete offer?"
        message={
          <>This will remove <strong>{offerToDelete?.title}</strong> from the storefront immediately.</>
        }
        tone="danger"
        confirmLabel="Delete offer"
        onConfirm={() => {
          if (offerToDelete) toast.warn(`"${offerToDelete.title}" deleted`);
          setOfferToDelete(null);
        }}
        onCancel={() => setOfferToDelete(null)}
      />
    </>
  );
}

interface OfferFormProps {
  offer: Offer | null;
}

function OfferForm({ offer }: OfferFormProps) {
  return (
    <div className="space-y-4">
      <TextField label="Title" defaultValue={offer?.title ?? ""} placeholder="Eid Bundle" />
      <TextField
        label="Slug"
        defaultValue={offer?.slug ?? ""}
        placeholder="eid-bundle"
        hint="Used in /deals#{slug}"
      />
      <TextField
        label="Discount label"
        defaultValue={offer?.discountLabel ?? ""}
        placeholder="Up to 22% off"
      />
      <TextField
        label="Badge label"
        defaultValue={offer?.badgeLabel ?? ""}
        placeholder="Limited"
      />
      <TextArea
        label="Description"
        defaultValue={offer?.description ?? ""}
        rows={4}
        placeholder="Buy any Grade A+ iPhone and get…"
      />
      <TextField
        label="Expires"
        type="date"
        defaultValue={offer?.expiresAt.slice(0, 10) ?? ""}
      />
      <ColorChips
        label="Accent color"
        defaultValue={offer?.accentColor ?? "emerald"}
        options={ACCENT_OPTIONS}
      />
      <Switch
        label="Visible on storefront"
        description="Toggle off to hide this offer from /deals and homepage."
        defaultChecked
      />
    </div>
  );
}
