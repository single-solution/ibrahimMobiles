"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, Paperclip, Phone, Send } from "lucide-react";
import { Button } from "@store/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusPill } from "@/components/shared/StatusPill";
import { SelectField } from "@/components/forms/SelectField";
import { TextArea } from "@/components/forms/TextArea";
import { useToast } from "@/components/ui/Toast";
import { WorkspaceDetailHeader } from "@/components/shared/workspaceUi";
import { apiFetch } from "@/lib/api";
import { getInitials } from "@/lib/initials";
import { classNames, createChatTransport } from "@store/shared";
import type {
  AdminInquiry,
  AdminInquiryAttachment,
  AdminInquiryMessage,
  AdminInquiryStatus,
  AdminInquirySummary,
} from "@/types/models";

import { STATUS_LABELS, STATUS_OPTIONS, STATUS_TONE } from "./inquiriesStatus";

const INQUIRY_POLL_FOCUSED_MS = 5_000;
const INQUIRY_POLL_BLURRED_MS = 30_000;

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

export function InquiryConversationPanel({
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
      escalated: detail.escalated,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInquiry(initial: boolean) {
      try {
        const since = pollCursorRef.current;
        const detail = await apiFetch<AdminInquiry | undefined>(
          since
            ? `/api/inquiries/${inquiryId}?since=${encodeURIComponent(since)}`
            : `/api/inquiries/${inquiryId}`,
          since ? { headers: { "If-None-Match": `"${since}"` } } : {},
        );
        if (cancelled || detail === undefined) return;
        pollCursorRef.current = detail.lastMessageAt;
        setInquiry(detail);
        if (detail.unreadByTeam > 0) {
          void apiFetch(`/api/inquiries/${inquiryId}/read`, { method: "POST" })
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
      const updated = await apiFetch<AdminInquiry>(`/api/inquiries/${inquiryId}`, {
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
      const updated = await apiFetch<AdminInquiry>(
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
      const updated = await apiFetch<AdminInquiry>(
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
      await apiFetch(`/api/inquiries/${inquiryId}`, { method: "DELETE" });
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
          <span className="flex items-center gap-1.5">
            {inquiry.escalated ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-600)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                <AlertTriangle size={11} />
                Needs senior
              </span>
            ) : null}
            <StatusPill tone={STATUS_TONE[inquiry.status]}>
              {STATUS_LABELS[inquiry.status]}
            </StatusPill>
          </span>
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

      {inquiry.escalated ? (
        <div className="flex items-center gap-2 border-b border-[var(--color-danger-200)] bg-[var(--color-danger-50)] px-3 py-2 text-xs text-[var(--color-danger-700)] md:px-5">
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            <strong>Escalated to a senior.</strong> The assistant is paused — reply to take over
            this chat.
          </span>
        </div>
      ) : null}

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
