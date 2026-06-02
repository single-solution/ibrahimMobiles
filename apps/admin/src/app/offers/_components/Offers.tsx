"use client";

import { useDeferredValue, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Tag, Trash2, Plus, Pencil, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import {
  WorkspaceEmptyPane,
  WorkspaceFrame,
  WorkspaceListHeader,
  WorkspacePrimaryAction,
  WorkspaceRowIconButton,
} from "@/components/shared/adminWorkspaceUi";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusPill } from "@/components/shared/StatusPill";
import { TextField } from "@/components/forms/TextField";
import { ColorChips } from "@/components/forms/ColorChips";
import { StructuredContentEditor } from "@/components/forms/StructuredContentEditor";
import { Switch } from "@/components/forms/Switch";
import { useToast } from "@/components/ui/Toast";
import { adminFetch } from "@/lib/adminApi";
import { OFFER_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import {
  emptyStructuredContent,
  formatRelativeDate,
  ISO_DATE_LENGTH,
  normalizeStructuredContent,
} from "@store/shared";
import type { SeoMeta, StructuredContent } from "@store/shared";
import { CatalogSeoPanel } from "@/app/settings/_components/CatalogSeoPanel";
import { ImageUpload } from "@/components/shared/uploads/ImageUpload";
import {
  type GalleryImage,
  uploadGalleryImages,
} from "@/components/shared/uploads/imageStaging";
import type { AdminOffer } from "@/types/admin";
import { PreviewPanel } from "@/app/categories/_components/previewPanel";
import {
  OfferCardCompactPreview,
  OfferCardFullPreview,
} from "@/app/categories/_components/previews";

const OFFER_SLUG_MAX_CHARS = 96;
/** Matches `--color-accent-500` — persisted on offer documents as hex. */
const DEFAULT_OFFER_COLOR = "#e1ff51";

const ACCENT_OPTIONS = [
  { value: "#10b981", label: "Emerald", swatch: "var(--color-offer-emerald)" },
  { value: "#e1ff51", label: "Chartreuse", swatch: "var(--color-accent-500)" },
  { value: "#f43f5e", label: "Rose", swatch: "var(--color-offer-rose)" },
  { value: "#0ea5e9", label: "Sky", swatch: "var(--color-offer-sky)" },
];

interface OffersProps {
  offers: AdminOffer[];
}

type DrawerState = { mode: "new" } | { mode: "edit"; offer: AdminOffer } | null;

export function Offers({ offers }: OffersProps) {
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

  const columns: AdminTableColumn<AdminOffer>[] = [
    {
      id: "title",
      header: "Offer",
      cell: (offer) => (
        <div className="flex items-center gap-3">
          <span
            className="size-9 shrink-0 rounded-[var(--radius-md)]"
            style={{ backgroundColor: offer.color }}
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
          <WorkspaceRowIconButton
            label="Edit offer"
            iconElement={<Pencil size={13} />}
            onClick={() => setDrawer({ mode: "edit", offer })}
          />
          <WorkspaceRowIconButton
            label="Delete offer"
            iconElement={<Trash2 size={13} />}
            tone="danger"
            onClick={() => setToDelete(offer)}
          />
        </div>
      ),
    },
  ];

  return (
    <WorkspaceFrame>
      <WorkspaceListHeader
        iconElement={<Tag size={15} />}
        title="Offers & deals"
        subtitle="Promotions surfaced on the homepage and the dedicated /deals page."
        action={
          <WorkspacePrimaryAction
            label="New offer"
            iconElement={<Plus size={14} />}
            onClick={() => setDrawer({ mode: "new" })}
          />
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        <AdminTable
          rows={offers}
          columns={columns}
          rowKey={(offer) => offer.id}
          searchAccessor={(offer) => `${offer.title} ${offer.description} ${offer.badgeLabel}`}
          searchPlaceholder="Search offers…"
          emptyState={
            <WorkspaceEmptyPane
              iconElement={<Tag size={22} />}
              title="No offers found"
              description="Create promotional bundles or holiday deals to display on the storefront."
            />
          }
        />
      </div>

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
    </WorkspaceFrame>
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
  const [content, setContent] = useState<StructuredContent>(() =>
    initial
      ? normalizeStructuredContent(initial.content, initial.description)
      : emptyStructuredContent(),
  );
  const description = content.summary;
  const [color, setColor] = useState<string>(initial?.color ?? DEFAULT_OFFER_COLOR);
  const [bannerImage, setBannerImage] = useState<GalleryImage | null>(
    initial?.bannerImage ?? null,
  );
  const [expiresAt, setExpiresAt] = useState(initial?.expiresAt?.slice(0, ISO_DATE_LENGTH) ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [seo, setSeo] = useState<SeoMeta>(initial?.seo ?? {});
  const [isSaving, setIsSaving] = useState(false);

  const deferredContent = useDeferredValue(content);
  const previewOffer = useMemo(
    () => ({
      title,
      discountLabel,
      badgeLabel,
      color,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : new Date().toISOString(),
      content: deferredContent,
    }),
    [title, discountLabel, badgeLabel, color, expiresAt, deferredContent],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const [storedBannerImage] = bannerImage
        ? await uploadGalleryImages([bannerImage], {
            subjectKind: "offers",
            subjectId: slug || title || initial?.id,
          })
        : [];
      const payload = {
        title,
        slug: slug || undefined,
        discountLabel,
        badgeLabel,
        description,
        content,
        color,
        bannerImage: storedBannerImage ?? null,
        expiresAt: expiresAt || null,
        isActive,
        seo,
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
      width="xl"
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
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
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
        <StructuredContentEditor
          value={content}
          onChange={setContent}
          summaryLabel="Description"
          summaryPlaceholder="Buy any item from this category and get…"
          summaryRows={4}
          maxSummaryLength={OFFER_FIELD_LIMITS.description}
          bulletsHint="Optional bullets surfaced on the deals page below the offer headline."
        />
        <TextField
          label="Expires"
          type="date"
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
          hint="Leave blank for an open-ended offer."
        />
        <ImageUpload
          label="Offer banner"
          value={bannerImage}
          onChange={setBannerImage}
          aspect="wide"
          hint="Used on the deals page and homepage feature cards when present."
        />
        <ColorChips
          label="Accent color"
          value={color}
          onChange={(value) => setColor(value)}
          options={ACCENT_OPTIONS}
        />
        <Switch
          label="Visible on storefront"
          description="Toggle off to hide this offer from /deals and the homepage."
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <CatalogSeoPanel
          value={seo}
          onChange={setSeo}
          contextLabel={title ? `Offer · ${title}` : "Offer"}
          entity={{
            type: "offer",
            entity: {
              slug,
              title,
              description,
            },
          }}
        />
      </form>
      <PreviewPanel
        hint="Updates as you type. Mirrors offer cards on the deals page."
        tiles={[
          {
            surfaceLabel: "Appears on: Offer card (compact)",
            body: <OfferCardCompactPreview offer={previewOffer} />,
          },
          {
            surfaceLabel: "Appears on: Deals page (large card)",
            body: <OfferCardFullPreview offer={previewOffer} />,
          },
        ]}
      />
      </div>
    </Drawer>
  );
}
