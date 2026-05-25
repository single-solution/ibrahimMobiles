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
import { ArrowLeft, Paperclip, MessageSquare, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { StatusPill, type StatusTone } from "@/components/StatusPill";
import { SelectField } from "@/components/forms/SelectField";
import { TextArea } from "@/components/forms/TextArea";
import { useToast } from "@/components/Toast";
import { CatalogSearchField } from "@/components/catalog/catalogWorkspaceUi";
import { adminFetch } from "@/lib/adminApi";
import { getInitials } from "@/lib/initials";
import { classNames, createChatTransport, formatTimeAgo } from "@store/shared";

const INQUIRY_POLL_FOCUSED_MS = 5_000;
const INQUIRY_POLL_BLURRED_MS = 30_000;
import type {
  AdminInquiry,
  AdminInquiryAttachment,
  AdminInquiryMessage,
  AdminInquiryStatus,
  AdminInquirySummary,
  AdminUser,
} from "@/types/admin";
import type { InquiriesPageAccess } from "@/app/inquiries/page";
import type { PermissionKey } from "@/lib/permissionsCatalog";

/**
 * Admin inquiries inbox — list, read, reply, assign, and resolve customer inquiries.
 * Actions are gated by role permissions (`inquiry_view`, `inquiry_reply`, `inquiry_manage`).
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
  access: InquiriesPageAccess;
}

interface InquiryListResponse {
  items: AdminInquirySummary[];
  total: number;
  page: number;
  limit: number;
}

interface TeamListResponse {
  items: AdminUser[];
}

function accessFlags(permissions: PermissionKey[]) {
  const set = new Set(permissions);
  return {
    canReply: set.has("inquiry_reply"),
    canManage: set.has("inquiry_manage"),
    canViewTeam: set.has("team_view"),
  };
}

export function Inquiries({ inquiries, access }: InquiriesProps) {
  const router = useRouter();
  const toast = useToast();
  const flags = accessFlags(access.permissions);
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteInquiries, setRemoteInquiries] = useState(inquiries);
  const [teamById, setTeamById] = useState<Map<string, string>>(new Map());
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
        const data = await adminFetch<InquiryListResponse>(
          "/api/inquiries?limit=200",
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
  }, [toast]);

  useEffect(() => {
    if (!flags.canManage && !flags.canViewTeam) {
      return;
    }
    let cancelled = false;
    async function loadTeam() {
      try {
        const data = await adminFetch<TeamListResponse>("/api/team?limit=200");
        if (cancelled) return;
        setTeamById(new Map(data.items.map((member) => [member.id, member.name])));
      } catch {
        // ignore — assignee names fall back to "Assigned"
      }
    }
    void loadTeam();
    return () => {
      cancelled = true;
    };
  }, [flags.canManage, flags.canViewTeam]);

  function assigneeLabel(userId?: string): string {
    if (!userId) return "Unassigned";
    return teamById.get(userId) ?? "Assigned";
  }

  const filteredInquiries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length === 0) {
      return remoteInquiries;
    }
    return remoteInquiries.filter((inquiry) =>
      `${inquiry.customerName} ${inquiry.phoneNumber} ${
        inquiry.subjectProductName ?? ""
      } ${inquiry.lastMessagePreview}`
        .toLowerCase()
        .includes(query),
    );
  }, [remoteInquiries, searchQuery]);

  const refreshInquiryInList = useCallback((updated: AdminInquirySummary) => {
    setRemoteInquiries((current) =>
      current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
    );
  }, []);

  useEffect(() => {
    scheduleStateUpdate(() => {
      if (filteredInquiries.length === 0) {
        setActiveInquiryId(null);
        return;
      }
      const activeStillVisible =
        activeInquiryId !== null &&
        filteredInquiries.some((inquiry) => inquiry.id === activeInquiryId);
      if (activeStillVisible) {
        return;
      }
      const preferDesktop =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 1024px)").matches;
      if (preferDesktop) {
        setActiveInquiryId(filteredInquiries[0].id);
      } else {
        setActiveInquiryId(null);
      }
    });
  }, [activeInquiryId, filteredInquiries]);

  return (
    <div className="flex min-h-[min(72vh,680px)] flex-1 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <ThreadListPane
          inquiries={filteredInquiries}
          activeId={activeInquiryId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={(id) => setActiveInquiryId(id)}
          assigneeLabel={assigneeLabel}
          hiddenOnMobile={Boolean(activeInquiryId)}
        />

        <section
          className={classNames(
            "flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-canvas)]",
            !activeInquiryId && "hidden lg:flex",
          )}
        >
          {activeInquiryId ? (
            <InquiryConversationPanel
              inquiryId={activeInquiryId}
              actorId={access.actorId}
              actorName={access.actorName}
              canReply={flags.canReply}
              canManage={flags.canManage}
              teamMembers={
                flags.canManage && flags.canViewTeam
                  ? [...teamById.entries()].map(([id, name]) => ({ id, name }))
                  : []
              }
              assigneeLabel={assigneeLabel}
              onBack={() => setActiveInquiryId(null)}
              onRead={handleInquiryRead}
              onThreadUpdated={refreshInquiryInList}
              onDeleted={() => {
                setActiveInquiryId(null);
                router.refresh();
              }}
              onCallTapped={(phoneNumber) => {
                window.location.href = `tel:${phoneNumber.replace(/\s+/g, "")}`;
              }}
            />
          ) : (
            <ConversationPlaceholder />
          )}
        </section>
      </div>
    </div>
  );
}

interface ThreadListPaneProps {
  inquiries: AdminInquirySummary[];
  activeId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  assigneeLabel: (userId?: string) => string;
  hiddenOnMobile: boolean;
}

function ThreadListPane({
  inquiries,
  activeId,
  searchQuery,
  onSearchChange,
  onSelect,
  assigneeLabel,
  hiddenOnMobile,
}: ThreadListPaneProps) {
  return (
    <aside
      className={classNames(
        "flex w-full shrink-0 flex-col border-b border-[var(--color-ink-100)] bg-[var(--color-surface)] lg:w-[min(340px,38%)] lg:max-w-sm lg:border-b-0 lg:border-r",
        hiddenOnMobile && "hidden lg:flex",
      )}
    >
      <header className="shrink-0 space-y-2 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="shrink-0 text-[var(--color-accent-700)]" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[var(--color-ink-900)]">Inquiries</h2>
            <p className="text-[10px] text-[var(--color-ink-500)]">
              {inquiries.length} conversation{inquiries.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <CatalogSearchField
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search conversations…"
          aria-label="Search conversations"
          className="w-full"
        />
      </header>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {inquiries.length === 0 ? (
          <li className="px-4 py-8 text-center text-xs text-[var(--color-ink-500)]">
            {searchQuery.trim()
              ? "No conversations match your search."
              : "No conversations yet."}
          </li>
        ) : (
          inquiries.map((inquiry) => (
            <li key={inquiry.id}>
              <ThreadListItem
                inquiry={inquiry}
                isActive={inquiry.id === activeId}
                assigneeLabel={assigneeLabel}
                onSelect={() => onSelect(inquiry.id)}
              />
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}

function ThreadListItem({
  inquiry,
  isActive,
  assigneeLabel,
  onSelect,
}: {
  inquiry: AdminInquirySummary;
  isActive: boolean;
  assigneeLabel: (userId?: string) => string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={classNames(
        "tap flex w-full gap-3 border-b border-[var(--color-ink-100)] px-3 py-3 text-left transition-colors",
        isActive ? "bg-[var(--color-accent-50)]" : "hover:bg-[var(--color-canvas-deep)]",
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-ink-700)]">
        {getInitials(inquiry.customerName)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
            {inquiry.customerName}
          </span>
          <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-ink-400)]">
            {formatTimeAgo(inquiry.lastMessageAt)}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--color-ink-600)]">
          {inquiry.lastMessagePreview || "No messages yet"}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusPill tone={STATUS_TONE[inquiry.status]}>{STATUS_LABELS[inquiry.status]}</StatusPill>
          <span className="text-[10px] text-[var(--color-ink-500)]">
            {assigneeLabel(inquiry.assignedToUserId)}
          </span>
          {inquiry.unreadByTeam > 0 ? (
            <span className="rounded-full bg-[var(--color-danger-600)] px-1.5 py-0.5 text-[9px] font-semibold text-white">
              {inquiry.unreadByTeam}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function ConversationPlaceholder() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
        <MessageSquare size={24} />
      </span>
      <p className="mt-4 text-sm font-semibold text-[var(--color-ink-900)]">Select a conversation</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--color-ink-500)]">
        Choose a thread on the left to read messages and reply to customers.
      </p>
    </div>
  );
}

interface InquiryConversationPanelProps {
  inquiryId: string;
  actorId: string;
  actorName: string;
  canReply: boolean;
  canManage: boolean;
  teamMembers: Array<{ id: string; name: string }>;
  assigneeLabel: (userId?: string) => string;
  onBack: () => void;
  onRead: (id: string) => void;
  onThreadUpdated: (summary: AdminInquirySummary) => void;
  onDeleted: () => void;
  onCallTapped: (phoneNumber: string) => void;
}

function InquiryConversationPanel({
  inquiryId,
  actorId,
  actorName,
  canReply,
  canManage,
  teamMembers,
  assigneeLabel,
  onBack,
  onRead,
  onThreadUpdated,
  onDeleted,
  onCallTapped,
}: InquiryConversationPanelProps) {
  const toast = useToast();
  const [inquiry, setInquiry] = useState<AdminInquiry | null>(null);
  const [status, setStatus] = useState<AdminInquiryStatus>("open");
  const [assignedToUserId, setAssignedToUserId] = useState<string>("");
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

  function syncListSummary(detail: AdminInquiry) {
    onThreadUpdated({
      id: detail.id,
      customerId: detail.customerId,
      customerName: detail.customerName,
      phoneNumber: detail.phoneNumber,
      subjectProductId: detail.subjectProductId,
      subjectProductName: detail.subjectProductName,
      status: detail.status,
      assignedToUserId: detail.assignedToUserId,
      lastMessageAt: detail.lastMessageAt,
      lastMessagePreview: detail.lastMessagePreview,
      lastMessageAuthor: detail.lastMessageAuthor,
      unreadByCustomer: detail.unreadByCustomer,
      unreadByTeam: detail.unreadByTeam,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    });
  }

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
          setAssignedToUserId(detail.assignedToUserId ?? "");
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

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [inquiry?.messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !inquiry) return;
    setIsSaving(true);
    try {
      const updated = await adminFetch<AdminInquiry>(`/api/inquiries/${inquiryId}`, {
        method: "PUT",
        json: {
          status,
          internalNotes,
          assignedToUserId: assignedToUserId || null,
        },
      });
      setInquiry(updated);
      setStatus(updated.status);
      syncListSummary(updated);
      toast.success("Inquiry updated");
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
        { method: "POST", json: { body } },
      );
      setInquiry(updated);
      setStatus(updated.status);
      syncListSummary(updated);
      setReply("");
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "Failed to send reply",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
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
        { method: "POST", body: formData },
      );
      setInquiry(updated);
      setStatus(updated.status);
      syncListSummary(updated);
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
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await adminFetch(`/api/inquiries/${inquiryId}`, { method: "DELETE" });
      toast.success("Inquiry deleted");
      onDeleted();
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "Failed to delete inquiry",
      );
      setIsDeleting(false);
    }
  }

  if (isLoading || !inquiry) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-ink-500)]">
        Loading conversation…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-3 md:px-4">
        <button
          type="button"
          aria-label="Back to inbox"
          onClick={onBack}
          className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-600)] hover:bg-[var(--color-canvas-deep)] lg:hidden"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-ink-700)]">
          {getInitials(inquiry.customerName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
            {inquiry.customerName}
          </p>
          <p className="truncate text-xs text-[var(--color-ink-500)]">
            {inquiry.phoneNumber}
            {inquiry.subjectProductName ? ` · ${inquiry.subjectProductName}` : ""}
          </p>
        </div>
        <StatusPill tone={STATUS_TONE[inquiry.status]}>{STATUS_LABELS[inquiry.status]}</StatusPill>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<Phone size={12} />}
            onClick={() => onCallTapped(inquiry.phoneNumber)}
            disabled={isDeleting}
          >
            Call
          </Button>
          {canManage ? (
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
          ) : null}
        </div>
      </header>

      <div
        ref={messagesContainerRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[var(--color-canvas-deep)] px-3 py-4 md:px-5"
      >
        {inquiry.messages.length === 0 ? (
          <p className="text-center text-xs text-[var(--color-ink-500)]">
            No messages yet. Send a reply below to start the conversation.
          </p>
        ) : (
          inquiry.messages.map((message) => (
            <InquiryBubble key={message.id} message={message} />
          ))
        )}
      </div>

      {canReply ? (
        <div className="shrink-0 border-t border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3 md:p-4">
          <div className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-2">
            <input
              ref={attachmentInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
              hidden
              onChange={handleAttachmentChange}
            />
            <button
              type="button"
              aria-label="Attach file"
              disabled={isUploading || isSending}
              onClick={() => attachmentInputRef.current?.click()}
              className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] disabled:opacity-40"
            >
              <Paperclip size={16} />
            </button>
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={1}
              maxLength={4_000}
              placeholder="Write a reply…"
              disabled={isUploading}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSendReply();
                }
              }}
              className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-[var(--color-ink-800)] placeholder:text-[var(--color-ink-400)] focus:outline-none"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSendReply}
              disabled={reply.trim().length === 0 || isUploading}
              isLoading={isSending}
              leadingIcon={<Send size={12} />}
              className="shrink-0"
            >
              Send
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-[var(--color-ink-500)]">
            Replying as {actorName}. Unassigned inquiries are claimed on first reply.
          </p>
        </div>
      ) : (
        <div className="shrink-0 border-t border-[var(--color-ink-100)] bg-[var(--color-surface-muted)] px-4 py-3 text-xs text-[var(--color-ink-600)]">
          Read-only access — you can view this conversation but not reply.
        </div>
      )}

      <details className="shrink-0 border-t border-[var(--color-ink-100)] bg-[var(--color-surface)]">
        <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]">
          Inquiry details
        </summary>
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-[var(--color-ink-100)] px-4 py-3">
          {canManage ? (
            <>
              <SelectField
                label="Status"
                value={status}
                onChange={(event) => setStatus(event.target.value as AdminInquiryStatus)}
                options={STATUS_OPTIONS.map((option) => ({
                  value: option,
                  label: STATUS_LABELS[option],
                }))}
              />
              {teamMembers.length > 0 ? (
                <SelectField
                  label="Assign to"
                  value={assignedToUserId}
                  onChange={(event) => setAssignedToUserId(event.target.value)}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...teamMembers.map((member) => ({
                      value: member.id,
                      label: member.id === actorId ? `${member.name} (you)` : member.name,
                    })),
                  ]}
                />
              ) : (
                <p className="text-xs text-[var(--color-ink-600)]">
                  {assigneeLabel(inquiry.assignedToUserId)}
                </p>
              )}
              <TextArea
                label="Internal note (team only)"
                placeholder="Notes for your team — not visible to the customer"
                value={internalNotes}
                onChange={(event) => setInternalNotes(event.target.value)}
                rows={3}
                maxLength={4_000}
              />
              <Button type="submit" variant="secondary" size="sm" isLoading={isSaving} disabled={isDeleting}>
                Save details
              </Button>
            </>
          ) : (
            <div className="text-xs text-[var(--color-ink-600)]">
              <p className="font-semibold text-[var(--color-ink-900)]">
                {assigneeLabel(inquiry.assignedToUserId)} · {STATUS_LABELS[inquiry.status]}
              </p>
              {inquiry.internalNotes ? (
                <p className="mt-1 whitespace-pre-wrap">{inquiry.internalNotes}</p>
              ) : null}
            </div>
          )}
        </form>
      </details>
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
        className="block max-w-[240px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)]"
      >
        <Image
          src={thumb}
          width={240}
          height={240}
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
      className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-800)] hover:bg-[var(--color-accent-50)]"
    >
      <Paperclip size={12} />
      <span className="max-w-[180px] truncate">{attachment.filename}</span>
      <span className="text-[10px] text-[var(--color-ink-500)]">{sizeKb} KB</span>
    </a>
  );
}

function InquiryBubble({ message }: { message: AdminInquiryMessage }) {
  const isAgent = message.author === "agent";
  const isAssistant = message.author === "assistant";
  const isTeamSide = isAgent || isAssistant;
  const attachments = message.attachments ?? [];
  return (
    <div
      className={classNames(
        "flex gap-2",
        isTeamSide ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={classNames(
          "max-w-[80%] rounded-[var(--radius-md)] px-3 py-2 text-xs shadow-[var(--shadow-sm)]",
          isAgent
            ? "rounded-tr-sm bg-[var(--color-ink-900)] text-[var(--color-canvas)]"
            : isAssistant
              ? "rounded-tr-sm border border-[var(--color-accent-300)] bg-[var(--color-accent-50)] text-[var(--color-ink-800)]"
              : "rounded-tl-sm bg-[var(--color-surface)] text-[var(--color-ink-800)]",
        )}
      >
        <p
          className={classNames(
            "text-[10px] font-semibold uppercase tracking-wide",
            isAgent
              ? "text-white/70"
              : isAssistant
                ? "text-[var(--color-accent-800)]"
                : "text-[var(--color-ink-500)]",
          )}
        >
          {message.authorName ?? message.author}
          {isAssistant && (
            <span className="ml-1 font-normal normal-case text-[var(--color-ink-500)]">
              · AI
            </span>
          )}
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
            isAgent
              ? "text-white/60"
              : isAssistant
                ? "text-[var(--color-ink-500)]"
                : "text-[var(--color-ink-400)]",
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

