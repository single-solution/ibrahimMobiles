"use client";

import Image from "next/image";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Paperclip, MessageSquare, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { StatusPill, type StatusTone } from "@/components/StatusPill";
import { SelectField } from "@/components/forms/SelectField";
import { TextArea } from "@/components/forms/TextArea";
import { useToast } from "@/components/Toast";
import {
  WorkspaceDetailHeader,
  WorkspaceEmptyPane,
  WorkspaceFrame,
  WorkspacePaneHeader,
  WorkspaceSearchField,
} from "@/components/workspace/adminWorkspaceUi";
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

export function Inquiries(props: InquiriesProps) {
  return (
    <Suspense fallback={null}>
      <InquiriesInner {...props} />
    </Suspense>
  );
}

function InquiriesInner({ inquiries, access }: InquiriesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const flags = accessFlags(access.permissions);
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteInquiries, setRemoteInquiries] = useState(inquiries);
  const [teamById, setTeamById] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    scheduleStateUpdate(() => {
      setRemoteInquiries(inquiries);
    });
  }, [inquiries]);
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);

  const setActiveInquiryUrl = useCallback(
    (id: string | null) => {
      setActiveInquiryId(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("inquiry", id);
      } else {
        params.delete("inquiry");
      }
      const query = params.toString();
      router.replace(query ? `/inquiries?${query}` : "/inquiries", { scroll: false });
    },
    [router, searchParams],
  );

  const clearActiveInquiry = useCallback(() => {
    setActiveInquiryUrl(null);
  }, [setActiveInquiryUrl]);

  const handleInquiryRead = useCallback((id: string) => {
    setRemoteInquiries((current) =>
      current.map((candidate) =>
        candidate.id === id ? { ...candidate, unreadByTeam: 0 } : candidate,
      ),
    );
  }, []);

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
      const fromUrl = searchParams.get("inquiry");
      if (fromUrl && remoteInquiries.some((inquiry) => inquiry.id === fromUrl)) {
        setActiveInquiryId(fromUrl);
        return;
      }
      if (filteredInquiries.length === 0) {
        if (activeInquiryId !== null) {
          setActiveInquiryUrl(null);
        }
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
      setActiveInquiryUrl(preferDesktop ? filteredInquiries[0].id : null);
    });
  }, [
    activeInquiryId,
    filteredInquiries,
    remoteInquiries,
    searchParams,
    setActiveInquiryUrl,
  ]);

  return (
    <WorkspaceFrame>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <ThreadListPane
          inquiries={filteredInquiries}
          activeId={activeInquiryId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={(id) => setActiveInquiryUrl(id)}
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
              onBack={clearActiveInquiry}
              onRead={handleInquiryRead}
              onThreadUpdated={refreshInquiryInList}
              onDeleted={() => {
                setActiveInquiryUrl(null);
                router.refresh();
              }}
              onCallTapped={(phoneNumber) => {
                window.location.href = `tel:${phoneNumber.replace(/\s+/g, "")}`;
              }}
            />
          ) : (
            <WorkspaceEmptyPane
              icon={MessageSquare}
              title="Select a conversation"
              description="Choose a thread on the left to read messages and reply to customers."
            />
          )}
        </section>
      </div>
    </WorkspaceFrame>
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
      <WorkspacePaneHeader
        icon={MessageSquare}
        title="Inquiries"
        subtitle={`${inquiries.length} conversation${inquiries.length === 1 ? "" : "s"} (recent 200) · from storefront chat`}
        search={
          <WorkspaceSearchField
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search conversations…"
            aria-label="Search conversations"
            className="w-full"
          />
        }
      />

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {inquiries.length === 0 ? (
          <li className="px-4 py-8 text-center text-xs text-[var(--color-ink-500)]">
            {searchQuery.trim()
              ? "No conversations match your search."
              : "No conversations yet. Threads appear when customers use the storefront chat widget."}
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
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 space-y-2 border-b border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-3 md:px-4">
          <div className="h-4 w-40 animate-pulse rounded bg-[var(--color-ink-100)]" />
          <div className="h-2.5 w-28 animate-pulse rounded bg-[var(--color-ink-100)]/70" />
        </div>
        <div className="flex-1 space-y-3 bg-[var(--color-canvas-deep)] p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`h-12 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-ink-100)]/70 ${
                index % 2 === 0 ? "w-[60%]" : "ml-auto w-[55%]"
              }`}
            />
          ))}
        </div>
        <div className="shrink-0 border-t border-[var(--color-ink-100)] p-3">
          <div className="h-10 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-ink-100)]/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceDetailHeader
        onBack={onBack}
        backLabel="Back to inbox"
        title={
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-ink-700)]">
              {getInitials(inquiry.customerName)}
            </span>
            <span className="truncate">{inquiry.customerName}</span>
          </span>
        }
        subtitle={
          <>
            {inquiry.phoneNumber}
            {inquiry.subjectProductName ? ` · ${inquiry.subjectProductName}` : ""}
          </>
        }
        badge={
          <StatusPill tone={STATUS_TONE[inquiry.status]}>
            {STATUS_LABELS[inquiry.status]}
          </StatusPill>
        }
        actions={
          <>
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
                onClick={() => setConfirmDelete(true)}
                isLoading={isDeleting}
                disabled={isSaving}
              >
                Delete
              </Button>
            ) : null}
          </>
        }
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete inquiry?"
        message={
          <>
            Delete the inquiry from <strong>{inquiry.customerName}</strong>? This cannot be
            undone.
          </>
        }
        tone="danger"
        confirmLabel="Delete inquiry"
        onConfirm={() => {
          setConfirmDelete(false);
          void handleDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <div
        ref={messagesContainerRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[var(--color-canvas-deep)] px-3 py-4 md:px-5"
      >
        {inquiry.messages.length === 0 ? (
          <p className="text-center text-xs text-[var(--color-ink-500)]">
            Waiting for the customer&apos;s first message from the chat widget.
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

