"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import type {
  AdminInquiry,
  AdminInquiryStatus,
  AdminInquirySummary,
} from "@/types/admin";

/**
 * Threaded-chat inquiries (PLAN §12).
 *
 * The full chat UI (send messages, attachments, polling/WebSocket
 * transport) lands in Phase 8 — see PHASE 8 "Chat plugin". This list
 * + drawer surface the metadata an admin needs to triage threads today:
 * status, assignee, customer / subject / last message preview, and the
 * full message log (read-only for now).
 */

const STATUS_TONE: Record<AdminInquiryStatus, StatusTone> = {
  open: "info",
  "awaiting-customer": "warn",
  resolved: "success",
};

const STATUS_LABELS: Record<AdminInquiryStatus, string> = {
  open: "Open",
  "awaiting-customer": "Awaiting customer",
  resolved: "Resolved",
};

const STATUS_OPTIONS: readonly AdminInquiryStatus[] = [
  "open",
  "awaiting-customer",
  "resolved",
];

interface InquiriesProps {
  inquiries: AdminInquirySummary[];
}

export function Inquiries({ inquiries }: InquiriesProps) {
  const router = useRouter();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | AdminInquiryStatus>(
    "all",
  );
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);

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
      map.set(
        status,
        inquiries.filter((inquiry) => inquiry.status === status).length,
      );
    }
    return map;
  }, [inquiries]);

  const columns: DataTableColumn<AdminInquirySummary>[] = [
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
              {inquiry.phoneNumber}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "subject",
      header: "Subject",
      hideOnMobile: true,
      cell: (inquiry) => (
        <p className="text-sm font-semibold text-[var(--color-ink-900)]">
          {inquiry.subjectProductName ?? "General"}
        </p>
      ),
    },
    {
      id: "lastMessage",
      header: "Last message",
      hideOnMobile: true,
      cell: (inquiry) => (
        <div className="max-w-[36ch]">
          <p className="truncate text-xs text-[var(--color-ink-700)]">
            {inquiry.lastMessagePreview}
          </p>
          <p className="text-[11px] text-[var(--color-ink-500)]">
            {new Date(inquiry.lastMessageAt).toLocaleString()}
          </p>
        </div>
      ),
    },
    {
      id: "unread",
      header: "Unread",
      align: "right",
      cell: (inquiry) =>
        inquiry.unreadByTeam > 0 ? (
          <StatusPill tone="danger">{inquiry.unreadByTeam}</StatusPill>
        ) : (
          <span className="text-xs text-[var(--color-ink-400)]">0</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: (inquiry) => (
        <StatusPill tone={STATUS_TONE[inquiry.status]}>
          {STATUS_LABELS[inquiry.status]}
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
            label={STATUS_LABELS[status]}
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
          `${inquiry.customerName} ${inquiry.phoneNumber} ${
            inquiry.subjectProductName ?? ""
          } ${inquiry.lastMessagePreview}`
        }
        searchPlaceholder="Search inquiries…"
        onRowClick={(inquiry) => setActiveInquiryId(inquiry.id)}
      />

      {activeInquiryId ? (
        <InquiryDrawer
          inquiryId={activeInquiryId}
          onClose={() => setActiveInquiryId(null)}
          onSaved={() => {
            setActiveInquiryId(null);
            router.refresh();
          }}
          onCallTapped={(phoneNumber) => toast.info(`Calling ${phoneNumber}`)}
        />
      ) : null}
    </>
  );
}

interface InquiryDrawerProps {
  inquiryId: string;
  onClose: () => void;
  onSaved: () => void;
  onCallTapped: (phoneNumber: string) => void;
}

function InquiryDrawer({
  inquiryId,
  onClose,
  onSaved,
  onCallTapped,
}: InquiryDrawerProps) {
  const toast = useToast();
  const [inquiry, setInquiry] = useState<AdminInquiry | null>(null);
  const [status, setStatus] = useState<AdminInquiryStatus>("open");
  const [internalNotes, setInternalNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Fetch inquiry detail (with full message thread) on mount / id change.
    let cancelled = false;
    async function load() {
      try {
        const detail = await adminFetch<AdminInquiry>(
          `/api/inquiries/${inquiryId}`,
        );
        if (cancelled) return;
        setInquiry(detail);
        setStatus(detail.status);
        setInternalNotes(detail.internalNotes ?? "");
      } catch (error) {
        toast.danger(
          error instanceof Error ? error.message : "Failed to load inquiry",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [inquiryId, toast]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await adminFetch(`/api/inquiries/${inquiryId}`, {
        method: "PUT",
        json: { status, internalNotes },
      });
      toast.success("Inquiry updated");
      onSaved();
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "Failed to update inquiry",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!inquiry) return;
    const confirmed = window.confirm(
      `Delete the inquiry from ${inquiry.customerName}? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }
    setIsDeleting(true);
    try {
      await adminFetch(`/api/inquiries/${inquiryId}`, { method: "DELETE" });
      toast.success("Inquiry deleted");
      onSaved();
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "Failed to delete inquiry",
      );
      setIsDeleting(false);
    }
  }

  if (isLoading || !inquiry) {
    return (
      <Drawer
        isOpen
        onClose={onClose}
        title="Loading…"
        description=""
        width="lg"
      >
        <p className="text-sm text-[var(--color-ink-500)]">Loading thread…</p>
      </Drawer>
    );
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={inquiry.customerName}
      description={
        inquiry.subjectProductName ? `Re: ${inquiry.subjectProductName}` : ""
      }
      width="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<Phone size={12} />}
              onClick={() => onCallTapped(inquiry.phoneNumber)}
              disabled={isDeleting}
            >
              Call
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="button"
              onClick={handleDelete}
              isLoading={isDeleting}
              disabled={isSaving}
            >
              Delete
            </Button>
          </div>
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
              disabled={isDeleting}
              leadingIcon={<Send size={12} />}
            >
              Save changes
            </Button>
          </div>
        </div>
      }
    >
      <form id="inquiry-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
            Message thread ({inquiry.messages.length})
          </p>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3">
            {inquiry.messages.length === 0 ? (
              <p className="text-xs text-[var(--color-ink-500)]">
                No messages yet.
              </p>
            ) : (
              inquiry.messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.author === "customer"
                      ? "rounded-[var(--radius-sm)] bg-[var(--color-canvas-deep)] p-2 text-xs text-[var(--color-ink-800)]"
                      : "rounded-[var(--radius-sm)] bg-[var(--color-accent-100)]/40 p-2 text-xs text-[var(--color-ink-900)]"
                  }
                >
                  <p className="font-semibold">
                    <MessageSquare
                      size={11}
                      className="mr-1 inline text-[var(--color-ink-400)]"
                    />
                    {message.authorName ?? message.author}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <SelectField
          label="Update status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as AdminInquiryStatus)
          }
          options={STATUS_OPTIONS.map((option) => ({
            value: option,
            label: STATUS_LABELS[option],
          }))}
        />

        <TextArea
          label="Internal note (not visible to customer)"
          placeholder="e.g. Promised callback at 4pm; waiting on grade C stock…"
          value={internalNotes}
          onChange={(event) => setInternalNotes(event.target.value)}
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
