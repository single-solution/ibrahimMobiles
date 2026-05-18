"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Drawer } from "@/components/Drawer";
import { StatusPill, type StatusTone } from "@/components/StatusPill";
import { SelectField } from "@/components/forms/SelectField";
import { TextArea } from "@/components/forms/TextArea";
import { useToast } from "@/components/Toast";
import { adminFetch } from "@/lib/adminApi";
import { getInitials } from "@/lib/initials";
import { formatPrice } from "@store/shared";
import type { AdminInquiry } from "@/types/admin";

const STATUS_TONE: Record<string, StatusTone> = {
  new: "info",
  "in-progress": "neutral",
  "awaiting-customer": "warn",
  won: "success",
  lost: "danger",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  "in-progress": "In progress",
  "awaiting-customer": "Awaiting customer",
  won: "Won",
  lost: "Lost",
};

const STATUS_OPTIONS = ["new", "in-progress", "awaiting-customer", "won", "lost"] as const;

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  phone: "Phone",
  facebook: "Facebook",
  instagram: "Instagram",
  "walk-in": "Walk-in",
  website: "Website",
  other: "Other",
};

interface InquiriesViewProps {
  inquiries: AdminInquiry[];
}

export function InquiriesView({ inquiries }: InquiriesViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [activeInquiry, setActiveInquiry] = useState<AdminInquiry | null>(null);

  const filteredInquiries = useMemo(() => {
    if (statusFilter === "all") {
      return inquiries;
    }
    return inquiries.filter((inquiry) => inquiry.status === statusFilter);
  }, [inquiries, statusFilter]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("all", inquiries.length);
    for (const status of STATUS_OPTIONS) {
      map.set(status, inquiries.filter((inquiry) => inquiry.status === status).length);
    }
    return map;
  }, [inquiries]);

  const columns: DataTableColumn<AdminInquiry>[] = [
    {
      id: "customer",
      header: "Customer",
      cell: (inquiry) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-ink-700)]">
            {getInitials(inquiry.customerName)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">
              {inquiry.customerName}
            </p>
            <p className="truncate text-[11px] text-[var(--color-ink-500)]">
              {inquiry.customerCity} · {inquiry.phoneNumber}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "model",
      header: "Variant",
      hideOnMobile: true,
      cell: (inquiry) => (
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink-900)]">{inquiry.modelName}</p>
          <p className="text-[11px] text-[var(--color-ink-500)]">
            {inquiry.variantSummary ?? "—"}
          </p>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Expected",
      align: "right",
      cell: (inquiry) => (
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">
          {inquiry.expectedRupees ? formatPrice(inquiry.expectedRupees) : "—"}
        </span>
      ),
    },
    {
      id: "source",
      header: "Source",
      hideOnMobile: true,
      cell: (inquiry) => (
        <StatusPill tone="neutral">{SOURCE_LABELS[inquiry.source] ?? inquiry.source}</StatusPill>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (inquiry) => (
        <StatusPill tone={STATUS_TONE[inquiry.status] ?? "neutral"}>
          {STATUS_LABELS[inquiry.status] ?? inquiry.status}
        </StatusPill>
      ),
    },
  ];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FilterChip
          label="All"
          count={counts.get("all") ?? 0}
          isActive={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        {STATUS_OPTIONS.map((status) => (
          <FilterChip
            key={status}
            label={STATUS_LABELS[status] ?? status}
            count={counts.get(status) ?? 0}
            isActive={statusFilter === status}
            onClick={() => setStatusFilter(status)}
          />
        ))}
      </div>

      <DataTable
        rows={filteredInquiries}
        columns={columns}
        rowKey={(inquiry) => inquiry.id}
        searchAccessor={(inquiry) =>
          `${inquiry.customerName} ${inquiry.customerCity} ${inquiry.modelName} ${inquiry.variantSummary ?? ""} ${inquiry.lastMessage}`
        }
        searchPlaceholder="Search inquiries…"
        onRowClick={(inquiry) => setActiveInquiry(inquiry)}
      />

      {activeInquiry ? (
        <InquiryDrawer
          inquiry={activeInquiry}
          onClose={() => setActiveInquiry(null)}
          onSaved={() => {
            setActiveInquiry(null);
            router.refresh();
          }}
          onCallTapped={(phoneNumber) => toast.info(`Calling ${phoneNumber}`)}
        />
      ) : null}
    </>
  );
}

interface InquiryDrawerProps {
  inquiry: AdminInquiry;
  onClose: () => void;
  onSaved: () => void;
  onCallTapped: (phoneNumber: string) => void;
}

function InquiryDrawer({ inquiry, onClose, onSaved, onCallTapped }: InquiryDrawerProps) {
  const toast = useToast();
  const [status, setStatus] = useState(inquiry.status);
  const [notes, setNotes] = useState(inquiry.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await adminFetch(`/api/inquiries/${inquiry.id}`, {
        method: "PUT",
        json: { status, notes },
      });
      toast.success("Inquiry updated");
      onSaved();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to update inquiry");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={inquiry.customerName}
      description={`${SOURCE_LABELS[inquiry.source] ?? inquiry.source} · ${inquiry.customerCity}`}
      width="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<Phone size={12} />}
            onClick={() => onCallTapped(inquiry.phoneNumber)}
          >
            Call
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="inquiry-form"
              isLoading={isSaving}
              leadingIcon={<Send size={12} />}
            >
              Save changes
            </Button>
          </div>
        </div>
      }
    >
      <form id="inquiry-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-3 text-xs text-[var(--color-ink-700)]">
          <p>
            <span className="font-semibold text-[var(--color-ink-900)]">{inquiry.modelName}</span>
            {inquiry.variantSummary ? ` · ${inquiry.variantSummary}` : ""}
          </p>
          {inquiry.expectedRupees ? (
            <p className="mt-1 text-[var(--color-ink-500)]">
              Expected price · {formatPrice(inquiry.expectedRupees)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
            Last message
          </p>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-ink-800)]">
            <MessageSquare size={12} className="mb-1 inline text-[var(--color-ink-400)]" />{" "}
            {inquiry.lastMessage}
          </div>
        </div>

        <SelectField
          label="Update status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={STATUS_OPTIONS.map((option) => ({
            value: option,
            label: STATUS_LABELS[option] ?? option,
          }))}
        />

        <TextArea
          label="Private note"
          placeholder="e.g. Customer prefers China pack, agreed Rs 122,000…"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          maxLength={4_000}
        />
      </form>
    </Drawer>
  );
}

interface FilterChipProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function FilterChip({ label, count, isActive, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        isActive
          ? "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-[var(--color-accent-100)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-accent-800)]"
          : "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-ink-700)] transition-colors hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink-900)]"
      }
    >
      {label}
      <span
        className={
          isActive
            ? "rounded-full bg-[var(--color-accent-200)]/70 px-1.5 text-[10px] font-semibold text-[var(--color-accent-800)]"
            : "rounded-full bg-[var(--color-canvas-deep)] px-1.5 text-[10px] font-semibold text-[var(--color-ink-500)]"
        }
      >
        {count}
      </span>
    </button>
  );
}
