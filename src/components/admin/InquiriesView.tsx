"use client";

import { useMemo, useState } from "react";
import { Filter, MessageSquare, Phone, Send, Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Drawer } from "@/components/admin/Drawer";
import { StatusPill, type StatusTone } from "@/components/admin/StatusPill";
import { SelectField } from "@/components/admin/forms/SelectField";
import { TextArea } from "@/components/admin/forms/TextArea";
import { useToast } from "@/components/admin/Toast";
import {
  getInquirySourceLabel,
  getInquiryStatusLabel,
  type Inquiry,
  type InquiryStatus,
} from "@/data/admin/inquiries";
import { formatPrice } from "@/lib/utils";

const STATUS_TONE: Record<InquiryStatus, StatusTone> = {
  new: "info",
  contacted: "neutral",
  "advance-paid": "accent",
  "video-sent": "info",
  dispatched: "warn",
  delivered: "success",
  cancelled: "danger",
  "money-back": "danger",
};

const STATUS_OPTIONS: InquiryStatus[] = [
  "new",
  "contacted",
  "advance-paid",
  "video-sent",
  "dispatched",
  "delivered",
  "cancelled",
  "money-back",
];

interface InquiriesViewProps {
  inquiries: Inquiry[];
}

export function InquiriesView({ inquiries }: InquiriesViewProps) {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | InquiryStatus>("all");
  const [activeInquiry, setActiveInquiry] = useState<Inquiry | null>(null);

  const filteredInquiries = useMemo(() => {
    if (statusFilter === "all") return inquiries;
    return inquiries.filter((inquiry) => inquiry.status === statusFilter);
  }, [inquiries, statusFilter]);

  const counts = useMemo(() => {
    const map = new Map<InquiryStatus | "all", number>();
    map.set("all", inquiries.length);
    for (const status of STATUS_OPTIONS) {
      map.set(status, inquiries.filter((inquiry) => inquiry.status === status).length);
    }
    return map;
  }, [inquiries]);

  const columns: DataTableColumn<Inquiry>[] = [
    {
      id: "customer",
      header: "Customer",
      cell: (inquiry) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-ink-700)]">
            {inquiry.customerName
              .split(" ")
              .map((part) => part.charAt(0))
              .slice(0, 2)
              .join("")}
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
          <p className="text-[11px] text-[var(--color-ink-500)]">{inquiry.variantSummary}</p>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Expected",
      align: "right",
      cell: (inquiry) => (
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">
          {formatPrice(inquiry.expectedRupees)}
        </span>
      ),
    },
    {
      id: "source",
      header: "Source",
      hideOnMobile: true,
      cell: (inquiry) => (
        <StatusPill tone="neutral">{getInquirySourceLabel(inquiry.source)}</StatusPill>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (inquiry) => (
        <StatusPill tone={STATUS_TONE[inquiry.status]}>
          {getInquiryStatusLabel(inquiry.status)}
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
            label={getInquiryStatusLabel(status)}
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
          `${inquiry.customerName} ${inquiry.customerCity} ${inquiry.modelName} ${inquiry.variantSummary} ${inquiry.lastMessage}`
        }
        searchPlaceholder="Search inquiries…"
        onRowClick={(inquiry) => setActiveInquiry(inquiry)}
        toolbar={
          <Button variant="outline" size="sm" leadingIcon={<Filter size={12} />}>
            More filters
          </Button>
        }
      />

      <Drawer
        isOpen={activeInquiry !== null}
        onClose={() => setActiveInquiry(null)}
        title={activeInquiry?.customerName ?? ""}
        description={activeInquiry ? `${getInquirySourceLabel(activeInquiry.source)} · ${activeInquiry.customerCity}` : undefined}
        width="lg"
        footer={
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<Phone size={12} />}
              onClick={() => toast.info(`Calling ${activeInquiry?.phoneNumber}`)}
            >
              Call
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leadingIcon={<Video size={12} />}
                onClick={() => toast.success("Dispatch video sent on WhatsApp")}
              >
                Send video
              </Button>
              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Send size={12} />}
                onClick={() => {
                  toast.success("Reply sent on WhatsApp");
                  setActiveInquiry(null);
                }}
              >
                Reply
              </Button>
            </div>
          </div>
        }
      >
        {activeInquiry && (
          <div className="space-y-5">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-3 text-xs text-[var(--color-ink-700)]">
              <p>
                <span className="font-semibold text-[var(--color-ink-900)]">
                  {activeInquiry.modelName}
                </span>{" "}
                · {activeInquiry.variantSummary}
              </p>
              <p className="mt-1 text-[var(--color-ink-500)]">
                Expected price · {formatPrice(activeInquiry.expectedRupees)}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                Last message
              </p>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-ink-800)]">
                <MessageSquare
                  size={12}
                  className="mb-1 inline text-[var(--color-ink-400)]"
                />{" "}
                {activeInquiry.lastMessage}
              </div>
            </div>

            <SelectField
              label="Update status"
              defaultValue={activeInquiry.status}
              options={STATUS_OPTIONS.map((status) => ({
                value: status,
                label: getInquiryStatusLabel(status),
              }))}
              onChange={(event) =>
                toast.success(
                  `Status changed to "${getInquiryStatusLabel(event.target.value as InquiryStatus)}"`,
                )
              }
            />

            <TextArea
              label="Add private note"
              placeholder="e.g. Customer prefers China pack, agreed Rs 122,000…"
              defaultValue={activeInquiry.notes ?? ""}
              rows={3}
            />
          </div>
        )}
      </Drawer>
    </>
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
          ? "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-[var(--color-accent-700)] px-3.5 py-1.5 text-xs font-semibold text-white"
          : "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-ink-700)] transition-colors hover:border-[var(--color-ink-400)]"
      }
    >
      {label}
      <span
        className={
          isActive
            ? "rounded-full bg-white/15 px-1.5 text-[10px] font-semibold"
            : "rounded-full bg-[var(--color-canvas-deep)] px-1.5 text-[10px] font-semibold text-[var(--color-ink-500)]"
        }
      >
        {count}
      </span>
    </button>
  );
}
