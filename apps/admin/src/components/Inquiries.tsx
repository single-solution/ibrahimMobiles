"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AdminTable, type AdminTableColumn } from "@/components/AdminTable";
import { Drawer } from "@/components/Drawer";
import { StatusPill, type StatusTone } from "@/components/StatusPill";
import { SelectField } from "@/components/forms/SelectField";
import { TextArea } from "@/components/forms/TextArea";
import { useToast } from "@/components/Toast";
import { adminFetch } from "@/lib/adminApi";
import { getInitials } from "@/lib/initials";
import { classNames, createChatTransport } from "@store/shared";

const INQUIRY_POLL_FOCUSED_MS = 5_000;
const INQUIRY_POLL_BLURRED_MS = 30_000;
import type {
  AdminInquiry,
  AdminInquiryAttachment,
  AdminInquiryMessage,
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

type InboxFilter = "all" | "mine" | "unassigned";

interface InquiryListResponse {
  items: AdminInquirySummary[];
  total: number;
  page: number;
  limit: number;
}

export function Inquiries({ inquiries }: InquiriesProps) {
  const router = useRouter();
  const toast = useToast();
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all");
  const [remoteInquiries, setRemoteInquiries] = useState(inquiries);
  const [statusFilter, setStatusFilter] = useState<"all" | AdminInquiryStatus>(
    "all",
  );
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);

  const handleInquiryRead = useCallback((id: string) => {
    setRemoteInquiries((current) =>
      current.map((candidate) =>
        candidate.id === id ? { ...candidate, unreadByTeam: 0 } : candidate,
      ),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const params = new URLSearchParams({ limit: "200" });
        if (inboxFilter !== "all") {
          params.set("filter", inboxFilter);
        }
        const data = await adminFetch<InquiryListResponse>(
          `/api/inquiries?${params.toString()}`,
        );
        if (!cancelled) {
          setRemoteInquiries(data.items);
        }
      } catch (error) {
        if (!cancelled) {
          toast.danger(
            error instanceof Error ? error.message : "Failed to load inquiries",
          );
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [inboxFilter, toast]);

  const filteredInquiries = useMemo(() => {
    if (statusFilter === "all") {
      return remoteInquiries;
    }
    return remoteInquiries.filter((inquiry) => inquiry.status === statusFilter);
  }, [remoteInquiries, statusFilter]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("all", remoteInquiries.length);
    for (const status of STATUS_OPTIONS) {
      map.set(
        status,
        remoteInquiries.filter((inquiry) => inquiry.status === status).length,
      );
    }
    return map;
  }, [remoteInquiries]);

  const columns: AdminTableColumn<AdminInquirySummary>[] = [
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
          {inquiry.subjectProductName ?? "Store inquiry"}
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
          label="Inbox"
          count={remoteInquiries.length}
          isActive={inboxFilter === "all"}
          onClick={() => setInboxFilter("all")}
        />
        <FilterChip
          label="Mine"
          count={inboxFilter === "mine" ? remoteInquiries.length : 0}
          isActive={inboxFilter === "mine"}
          onClick={() => setInboxFilter("mine")}
        />
        <FilterChip
          label="Unassigned"
          count={inboxFilter === "unassigned" ? remoteInquiries.length : 0}
          isActive={inboxFilter === "unassigned"}
          onClick={() => setInboxFilter("unassigned")}
        />
      </div>

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

      <AdminTable
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
          onRead={handleInquiryRead}
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
  onRead: (id: string) => void;
  onSaved: () => void;
  onCallTapped: (phoneNumber: string) => void;
}

function InquiryDrawer({
  inquiryId,
  onClose,
  onRead,
  onSaved,
  onCallTapped,
}: InquiryDrawerProps) {
  const toast = useToast();
  const [inquiry, setInquiry] = useState<AdminInquiry | null>(null);
  const [status, setStatus] = useState<AdminInquiryStatus>("open");
  const [internalNotes, setInternalNotes] = useState("");
  const [reply, setReply] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const pollCursorRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInquiry(initial: boolean) {
      try {
        const since = pollCursorRef.current;
        const detail = await adminFetch<AdminInquiry | undefined>(
          since
            ? `/api/inquiries/${inquiryId}?since=${encodeURIComponent(since)}`
            : `/api/inquiries/${inquiryId}`,
          since ? { headers: { "If-None-Match": `"${since}"` } } : {},
        );
        if (cancelled || detail === undefined) return;
        pollCursorRef.current = detail.lastMessageAt;
        setInquiry(detail);
        if (detail.unreadByTeam > 0) {
          void adminFetch(`/api/inquiries/${inquiryId}/read`, { method: "POST" })
            .then(() => {
              if (!cancelled) {
                onRead(inquiryId);
                setInquiry((current) =>
                  current ? { ...current, unreadByTeam: 0 } : current,
                );
              }
            })
            .catch(() => undefined);
        }
        if (initial) {
          setStatus(detail.status);
          setInternalNotes(detail.internalNotes ?? "");
        }
      } catch (error) {
        if (initial) {
          toast.danger(
            error instanceof Error ? error.message : "Failed to load inquiry",
          );
        }
      } finally {
        if (initial && !cancelled) setIsLoading(false);
      }
    }

    void loadInquiry(true);

    const transport = createChatTransport({
      pollIntervalMsFocused: INQUIRY_POLL_FOCUSED_MS,
      pollIntervalMsBlurred: INQUIRY_POLL_BLURRED_MS,
      onTick: () => loadInquiry(false),
    });
    transport.start();

    return () => {
      cancelled = true;
      transport.stop();
    };
  }, [inquiryId, onRead, toast]);

  // Auto-scroll to the latest message once the thread renders.
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [inquiry?.messages.length]);

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

  async function handleSendReply() {
    const body = reply.trim();
    if (body.length === 0 || isSending) return;
    setIsSending(true);
    try {
      const updated = await adminFetch<AdminInquiry>(
        `/api/inquiries/${inquiryId}/messages`,
        {
          method: "POST",
          json: { body },
        },
      );
      setInquiry(updated);
      setStatus(updated.status);
      setReply("");
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "Failed to send reply",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleAttachmentChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (reply.trim()) formData.append("body", reply.trim());
      const updated = await adminFetch<AdminInquiry>(
        `/api/inquiries/${inquiryId}/attachments`,
        {
          method: "POST",
          body: formData,
        },
      );
      setInquiry(updated);
      setStatus(updated.status);
      setReply("");
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "Failed to upload attachment",
      );
    } finally {
      setIsUploading(false);
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
            Conversation ({inquiry.messages.length})
          </p>
          <div
            ref={messagesContainerRef}
            className="max-h-80 space-y-2 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-3"
          >
            {inquiry.messages.length === 0 ? (
              <p className="text-xs text-[var(--color-ink-500)]">
                No messages yet.
              </p>
            ) : (
              inquiry.messages.map((message) => (
                <InquiryBubble key={message.id} message={message} />
              ))
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
            Reply to customer
          </label>
          <div className="flex items-end gap-2">
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={3}
              maxLength={4_000}
              placeholder="Type your reply…"
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink-800)] focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-300)]"
            />
            <div className="flex flex-col gap-2">
              <input
                ref={attachmentInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
                hidden
                onChange={handleAttachmentChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => attachmentInputRef.current?.click()}
                isLoading={isUploading}
                disabled={isSending}
                leadingIcon={<Paperclip size={12} />}
                aria-label="Attach file"
              >
                Attach
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSendReply}
                disabled={reply.trim().length === 0 || isUploading}
                isLoading={isSending}
                leadingIcon={<Send size={12} />}
              >
                Send
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--color-ink-500)]">
            Press Send to push to the customer. Replying auto-flips status to
            &quot;Awaiting customer&quot; and claims the thread if unassigned.
          </p>
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

        <div className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface-muted)] p-3 text-xs text-[var(--color-ink-600)]">
          <p className="font-semibold text-[var(--color-ink-900)]">
            {inquiry.assignedToUserId ? "Assigned thread" : "Unassigned thread"}
          </p>
          <p className="mt-1">
            Replying claims unassigned inquiries automatically, so every active
            customer conversation has a clear team owner.
          </p>
        </div>

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

function InquiryBubble({ message }: { message: AdminInquiryMessage }) {
  const isAgent = message.author === "agent";
  const attachments = message.attachments ?? [];
  return (
    <div
      className={classNames(
        "flex gap-2",
        isAgent ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={classNames(
          "max-w-[80%] rounded-[var(--radius-md)] px-3 py-2 text-xs shadow-[var(--shadow-sm)]",
          isAgent
            ? "rounded-tr-sm bg-[var(--color-ink-900)] text-[var(--color-canvas)]"
            : "rounded-tl-sm bg-[var(--color-surface)] text-[var(--color-ink-800)]",
        )}
      >
        <p
          className={classNames(
            "text-[10px] font-semibold uppercase tracking-wide",
            isAgent ? "text-white/70" : "text-[var(--color-ink-500)]",
          )}
        >
          {message.authorName ?? message.author}
        </p>
        {attachments.length > 0 && (
          <div className="mt-1 flex flex-col gap-1.5">
            {attachments.map((attachment, index) => (
              <InquiryAttachmentChip
                key={`${message.id}-att-${index}`}
                attachment={attachment}
              />
            ))}
          </div>
        )}
        <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed">
          {message.body}
        </p>
        <p
          className={classNames(
            "mt-1 text-[10px]",
            isAgent ? "text-white/60" : "text-[var(--color-ink-400)]",
          )}
        >
          {new Date(message.createdAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function InquiryAttachmentChip({
  attachment,
}: {
  attachment: AdminInquiryAttachment;
}) {
  if (attachment.kind === "image") {
    const thumb =
      attachment.image.variants.thumb || attachment.image.variants.card;
    const full =
      attachment.image.variants.full || attachment.image.variants.detail;
    return (
      <a
        href={full}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-[160px] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-ink-100)]"
      >
        <Image
          src={thumb}
          width={160}
          height={160}
          alt={attachment.image.alt ?? "Attached image"}
          placeholder={attachment.image.blurDataURL ? "blur" : undefined}
          blurDataURL={attachment.image.blurDataURL ?? undefined}
          className="block h-auto w-full object-cover"
          unoptimized
        />
      </a>
    );
  }
  const sizeKb = Math.max(1, Math.round(attachment.sizeBytes / 1024));
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2 py-1 text-[10px] font-medium text-[var(--color-ink-800)] hover:bg-[var(--color-accent-50)]"
    >
      <Paperclip size={10} />
      <span className="max-w-[140px] truncate">{attachment.filename}</span>
      <span className="text-[var(--color-ink-500)]">{sizeKb} KB</span>
    </a>
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
