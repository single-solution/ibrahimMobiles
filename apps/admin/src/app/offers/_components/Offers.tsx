"use client";

import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Tag, Trash2, Plus, Pencil, CalendarClock, Layers, Percent, Sparkles } from "lucide-react";
import { Button } from "@store/ui";
import {
  WorkspaceCatalogPaneHeader,
  WorkspaceEmptyPane,
  WorkspaceFilterChip,
  WorkspaceFrame,
  WorkspacePrimaryAction,
  WorkspaceRowIconButton,
  WorkspaceSearchField,
} from "@/components/shared/workspaceUi";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Stepper } from "@/components/ui/Stepper";
import { StatusPill, type StatusTone } from "@/components/shared/StatusPill";
import { TextField } from "@/components/forms/TextField";
import { ColorChips } from "@/components/forms/ColorChips";
import { StructuredContentEditor } from "@/components/forms/StructuredContentEditor";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/api";
import { pingNavigationProgress } from "@/lib/navigation/navigationProgress";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { OFFER_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import {
  classNames,
  emptyStructuredContent,
  formatRelativeDate,
  normalizeStructuredContent,
} from "@store/shared";
import type { SeoMeta, StructuredContent } from "@store/shared";
import { CatalogSeoPanel } from "@/app/settings/_components/CatalogSeoPanel";
import { ImageUpload } from "@/components/shared/uploads/ImageUpload";
import {
  type GalleryImage,
  uploadGalleryImages,
} from "@/components/shared/uploads/imageStaging";
import type { AdminOffer } from "@/types/models";
import { PreviewPanel } from "@/app/categories/_components/previewPanel";
import {
  OfferCardCompactPreview,
  OfferCardFullPreview,
} from "@/app/categories/_components/previews";
import { OfferRulesEditor } from "./OfferRulesEditor";
import type { OfferCondition, OfferAction, OfferSchedule, OfferConstraints } from "@store/shared";

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

type OfferStatus = "live" | "scheduled" | "expired" | "hidden";
type OfferStatusFilter = OfferStatus | "all";

const STATUS_FILTERS: { id: OfferStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "scheduled", label: "Scheduled" },
  { id: "expired", label: "Expired" },
  { id: "hidden", label: "Hidden" },
];

const STATUS_META: Record<OfferStatus, { label: string; tone: StatusTone }> = {
  live: { label: "Live", tone: "success" },
  scheduled: { label: "Scheduled", tone: "info" },
  expired: { label: "Expired", tone: "danger" },
  hidden: { label: "Hidden", tone: "neutral" },
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getOfferStatus(offer: AdminOffer, now: number): OfferStatus {
  if (!offer.isActive) {
    return "hidden";
  }
  const start = offer.schedule?.startDate ? new Date(offer.schedule.startDate).getTime() : null;
  const end = offer.schedule?.endDate ? new Date(offer.schedule.endDate).getTime() : null;
  if (end !== null && now > end) {
    return "expired";
  }
  if (start !== null && now < start) {
    return "scheduled";
  }
  return "live";
}

function summarizeAction(action: OfferAction): string {
  const target = action?.target === "cart_total" ? "cart total" : "matched items";
  if (action?.type === "free_shipping") {
    return "Free shipping";
  }
  if (action?.type === "percentage_discount") {
    return `${action.value}% off ${target}`;
  }
  if (action?.type === "fixed_amount_discount") {
    return `Rs ${action.value} off ${target}`;
  }
  return "Discount";
}

function summarizeSchedule(schedule: OfferSchedule): string | null {
  const parts: string[] = [];
  const days = schedule?.daysOfWeek;
  if (days?.length) {
    parts.push(
      [...days]
        .sort((first, second) => first - second)
        .map((day) => WEEKDAY_LABELS[day])
        .filter(Boolean)
        .join(", "),
    );
  }
  if (schedule?.startTime || schedule?.endTime) {
    parts.push(`${schedule.startTime ?? "00:00"}–${schedule.endTime ?? "23:59"}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

function summarizeWindow(offer: AdminOffer, status: OfferStatus): string {
  const start = offer.schedule?.startDate;
  const end = offer.schedule?.endDate;
  if (status === "scheduled" && start) {
    return `Starts ${formatRelativeDate(new Date(start).toISOString())}`;
  }
  if (status === "expired" && end) {
    return `Ended ${formatRelativeDate(new Date(end).toISOString())}`;
  }
  if (end) {
    return `Ends ${formatRelativeDate(new Date(end).toISOString())}`;
  }
  return "Open-ended";
}

export function Offers({ offers }: OffersProps) {
  const router = useRouter();
  const toast = useToast();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [toDelete, setToDelete] = useState<AdminOffer | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OfferStatusFilter>("all");
  const deferredQuery = useDeferredValue(query);

  const [now] = useState(() => Date.now());

  const counts = useMemo(() => {
    const tally: Record<OfferStatusFilter, number> = {
      all: offers.length,
      live: 0,
      scheduled: 0,
      expired: 0,
      hidden: 0,
    };
    for (const offer of offers) {
      tally[getOfferStatus(offer, now)] += 1;
    }
    return tally;
  }, [offers, now]);

  const visibleOffers = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase();
    return offers.filter((offer) => {
      if (statusFilter !== "all" && getOfferStatus(offer, now) !== statusFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      return `${offer.title} ${offer.description} ${offer.badgeLabel} ${offer.discountLabel}`
        .toLowerCase()
        .includes(term);
    });
  }, [offers, deferredQuery, statusFilter, now]);

  function refresh() {
    pingNavigationProgress();
    router.refresh();
  }

  async function handleDelete() {
    if (!toDelete) {
      return;
    }
    try {
      await apiFetch(`/api/offers/${toDelete.id}`, { method: "DELETE" });
      toast.warn(`"${toDelete.title}" deleted`);
      setToDelete(null);
      refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to delete offer");
    }
  }

  return (
    <WorkspaceFrame>
      <WorkspaceCatalogPaneHeader
        title={
          <div className="flex min-w-0 items-center gap-1.5">
            <Tag size={15} className="shrink-0 text-[var(--color-accent-700)]" />
            <h2 className="text-sm font-semibold text-[var(--color-ink-900)]">Offers &amp; deals</h2>
          </div>
        }
        subtitle={`${visibleOffers.length} shown · ${offers.length} total`}
        search={
          <WorkspaceSearchField
            value={query}
            onChange={setQuery}
            placeholder="Search offers…"
            aria-label="Search offers"
            className="min-w-0 flex-1 sm:max-w-[14rem] sm:flex-none"
          />
        }
        action={
          <WorkspacePrimaryAction
            label="New offer"
            iconElement={<Plus size={14} />}
            onClick={() => setDrawer({ mode: "new" })}
          />
        }
        filters={STATUS_FILTERS.map((filter) => (
          <WorkspaceFilterChip
            key={filter.id}
            label={filter.label}
            count={counts[filter.id]}
            isActive={statusFilter === filter.id}
            onClick={() => setStatusFilter(filter.id)}
          />
        ))}
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        {visibleOffers.length === 0 ? (
          <WorkspaceEmptyPane
            iconElement={<Tag size={22} />}
            title="No offers found"
            description="Create promotional bundles or holiday deals to display on the storefront."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                status={getOfferStatus(offer, now)}
                onEdit={() => setDrawer({ mode: "edit", offer })}
                onDelete={() => setToDelete(offer)}
                onToggled={refresh}
              />
            ))}
          </div>
        )}
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

interface OfferCardProps {
  offer: AdminOffer;
  status: OfferStatus;
  onEdit: () => void;
  onDelete: () => void;
  onToggled: () => void;
}

function OfferCard({ offer, status, onEdit, onDelete, onToggled }: OfferCardProps) {
  const accent = offer.color?.trim() || DEFAULT_OFFER_COLOR;
  const background = `linear-gradient(135deg, color-mix(in srgb, ${accent} 82%, var(--color-ink-900)) 0%, color-mix(in srgb, ${accent} 48%, var(--color-ink-900)) 100%)`;
  const statusMeta = STATUS_META[status];
  const scheduleSummary = summarizeSchedule(offer.schedule);
  const conditionsLabel =
    offer.conditions?.length > 0
      ? `${offer.conditions.length} condition${offer.conditions.length === 1 ? "" : "s"}`
      : "Whole cart";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div
        className="relative flex min-h-32 flex-col justify-between overflow-hidden p-3.5 text-white"
        style={{ background }}
      >
        <div className="relative flex items-start justify-between gap-2">
          <span className="inline-flex rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
            {offer.badgeLabel || "Offer"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
            <CalendarClock size={11} />
            {summarizeWindow(offer, status)}
          </span>
        </div>
        <div className="relative space-y-0.5">
          {offer.discountLabel ? (
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/85">
              {offer.discountLabel}
            </p>
          ) : null}
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight tracking-tight">
            {offer.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={statusMeta.tone}>{statusMeta.label}</StatusPill>
          <StatusPill tone="accent" leadingIcon={<Percent size={11} />}>
            {summarizeAction(offer.action)}
          </StatusPill>
          <StatusPill tone="neutral" leadingIcon={<Tag size={11} />}>
            {conditionsLabel}
          </StatusPill>
          {scheduleSummary ? (
            <StatusPill tone="info" leadingIcon={<CalendarClock size={11} />}>
              {scheduleSummary}
            </StatusPill>
          ) : null}
          {offer.constraints?.isStackable ? (
            <StatusPill tone="neutral" leadingIcon={<Layers size={11} />}>
              Stackable
            </StatusPill>
          ) : null}
          {offer.constraints?.allowLoyaltyPoints ? (
            <StatusPill tone="neutral" leadingIcon={<Sparkles size={11} />}>
              Loyalty
            </StatusPill>
          ) : null}
          {typeof offer.constraints?.usageLimit === "number" ? (
            <StatusPill tone="neutral">
              {offer.constraints.usageCount}/{offer.constraints.usageLimit} used
            </StatusPill>
          ) : null}
        </div>

        {offer.description ? (
          <p className="line-clamp-2 text-[11.5px] leading-relaxed text-[var(--color-ink-500)]">
            {offer.description}
          </p>
        ) : null}

        <p className="truncate text-[11px] text-[var(--color-ink-400)]">/deals#{offer.slug}</p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--color-ink-100)] pt-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-ink-600)]">
            <OfferVisibilityToggle
              offerId={offer.id}
              offerTitle={offer.title}
              isActive={offer.isActive}
              onUpdated={onToggled}
            />
            Live
          </span>
          <div className="flex items-center gap-1">
            <WorkspaceRowIconButton
              label="Edit offer"
              iconElement={<Pencil size={13} />}
              onClick={onEdit}
            />
            <WorkspaceRowIconButton
              label="Delete offer"
              iconElement={<Trash2 size={13} />}
              tone="danger"
              onClick={onDelete}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

interface OfferDrawerProps {
  state: { mode: "new" } | { mode: "edit"; offer: AdminOffer };
  onClose: () => void;
  onSaved: () => void;
}

function OfferDrawer({ state, onClose, onSaved }: OfferDrawerProps) {
  const router = useRouter();
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
  const [seo, setSeo] = useState<SeoMeta>(initial?.seo ?? {});
  const [offerId, setOfferId] = useState<string | null>(initial?.id ?? null);
  
  const [conditions, setConditions] = useState<OfferCondition[]>(initial?.conditions ?? []);
  const [action, setAction] = useState<OfferAction>(initial?.action ?? { type: "percentage_discount", value: 10, target: "matched_items" });
  const [schedule, setSchedule] = useState<OfferSchedule>(initial?.schedule ?? {});
  const [constraints, setConstraints] = useState<OfferConstraints>(initial?.constraints ?? { allowLoyaltyPoints: false, isStackable: false, usageCount: 0 });

  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const steps = [
    { id: 1, label: "Basics" },
    { id: 2, label: "Rules" },
    { id: 3, label: "SEO & Publish" },
  ];

  const deferredContent = useDeferredValue(content);
  const previewOffer = useMemo(
    () => ({
      title,
      discountLabel,
      badgeLabel,
      color,
      expiresAt: schedule.endDate ? new Date(schedule.endDate).toISOString() : "",
      content: deferredContent,
    }),
    [title, discountLabel, badgeLabel, color, schedule.endDate, deferredContent],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>, isNext = false) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    setIsSaving(true);
    try {
      const [storedBannerImage] = bannerImage
        ? await uploadGalleryImages([bannerImage], {
            subjectKind: "offers",
            subjectId: slug || title || initial?.id,
          })
        : [];
      
      const isFinalStep = !isNext;
      
      const payload = {
        title,
        slug: slug || undefined,
        discountLabel,
        badgeLabel,
        description,
        content,
        color,
        bannerImage: storedBannerImage ?? null,
        isActive: initial ? initial.isActive : (isFinalStep ? true : false),
        seo,
        conditions,
        action,
        schedule,
        constraints,
      };
      const targetId = offerId;
      if (targetId) {
        await apiFetch(`/api/offers/${targetId}`, { method: "PUT", json: payload });
        if (isFinalStep) {
          toast.success("Offer updated");
        }
      } else {
        const created = await apiFetch<AdminOffer>(`/api/offers`, { method: "POST", json: payload });
        setOfferId(created.id);
        if (isFinalStep) {
          toast.success("Offer published");
        }
      }
      
      if (isNext) {
        router.refresh();
        setStep((s) => Math.min(totalSteps, s + 1));
      } else {
        onSaved();
      }
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
      topBar={
        <div className="flex justify-center py-2">
          <Stepper steps={steps} currentStep={step} className="max-w-md" />
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium text-[var(--color-ink-500)]">
            Step {step} of {totalSteps}
          </div>
          <div className="flex items-center gap-2">
            {step === 1 ? (
              <Button variant="ghost" size="md" type="button" onClick={onClose}>
                Cancel
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                Back
              </Button>
            )}
            {step < totalSteps ? (
              <Button
                variant="primary"
                size="md"
                type="submit"
                form="offer-form"
                isLoading={isSaving}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                type="submit"
                form="offer-form"
                isLoading={isSaving}
              >
                {isEdit ? "Save changes" : "Publish offer"}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className={step === 3 ? "grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]" : ""}>
      <form id="offer-form" onSubmit={(e) => {
        handleSubmit(e, step < totalSteps);
      }} className="space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={OFFER_FIELD_LIMITS.title}
              placeholder="Eid Bundle"
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
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="mb-4 text-lg font-bold text-[var(--color-ink-900)]">Offer Rules Engine</h2>
            <OfferRulesEditor
              conditions={conditions}
              onChangeConditions={setConditions}
              action={action}
              onChangeAction={setAction}
              schedule={schedule}
              onChangeSchedule={setSchedule}
              constraints={constraints}
              onChangeConstraints={setConstraints}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
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
          </div>
        )}
      </form>

      {step === 3 && (
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
      )}
      </div>
    </Drawer>
  );
}

function OfferVisibilityToggle({
  offerId,
  offerTitle,
  isActive: initialActive,
  onUpdated,
}: {
  offerId: string;
  offerTitle: string;
  isActive: boolean;
  onUpdated: () => void;
}) {
  const toast = useToast();
  const [isActive, setIsActive] = useState(initialActive);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    scheduleStateUpdate(() => {
      setIsActive(initialActive);
    });
  }, [initialActive, offerId]);

  async function handleToggle() {
    const next = !isActive;
    setSaving(true);
    try {
      await apiFetch(`/api/offers/${offerId}`, {
        method: "PUT",
        json: { isActive: next },
      });
      setIsActive(next);
      toast.success(
        next
          ? `"${offerTitle}" is visible on the storefront`
          : `"${offerTitle}" is hidden from the storefront`,
      );
      onUpdated();
    } catch (error) {
      toast.danger(
        error instanceof ApiError
          ? error.message
          : "Failed to update offer visibility.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Toggle
      checked={isActive}
      onCheckedChange={() => void handleToggle()}
      isLoading={saving}
      aria-label={
        isActive
          ? `Disable ${offerTitle} on storefront`
          : `Enable ${offerTitle} on storefront`
      }
    />
  );
}
