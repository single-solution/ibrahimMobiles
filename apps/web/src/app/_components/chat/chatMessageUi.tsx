"use client";

import Image from "next/image";
import { Paperclip } from "lucide-react";

import {
  CHAT_GUEST_MESSAGE_LIMIT,
  CHAT_SUPPORT_DISPLAY_NAME,
  classNames,
  resolveChatWelcomeMessage,
  type ChatAttachment,
  type ChatMessage,
  type ChatStatus,
  type ChatThreadSummary,
} from "@store/shared";

/** Formal welcome copy for empty inquiry threads. */
export function chatWelcomeMessage(input: {
  audience: "guest" | "customer";
  guestMessageLimit?: number;
  welcomeMessageGuest?: string;
  welcomeMessageCustomer?: string;
}): string {
  return resolveChatWelcomeMessage({
    audience: input.audience,
    guestMessageLimit: input.guestMessageLimit,
    settings: {
      welcomeMessageGuest: input.welcomeMessageGuest ?? "",
      welcomeMessageCustomer: input.welcomeMessageCustomer ?? "",
    },
  });
}

export interface ChatMessageDayGroup {
  day: string;
  messages: ChatMessage[];
}

export function chatThreadTitle(
  thread: Pick<ChatThreadSummary, "subjectProductName" | "customerName">,
): string {
  return thread.subjectProductName?.trim() || "Support chat";
}

export function chatStatusMeta(status: ChatStatus): {
  label: string;
  pillClass: string;
  dotClass: string;
} {
  switch (status) {
    case "open":
      return {
        label: "Active",
        pillClass:
          "bg-[var(--color-success-50)] text-[var(--color-success-800)] ring-1 ring-inset ring-[var(--color-success-200)]",
        dotClass: "bg-[var(--color-success-500)]",
      };
    case "awaiting-customer":
      return {
        label: "Reply needed",
        pillClass:
          "bg-[var(--color-warn-50)] text-[var(--color-warn-800)] ring-1 ring-inset ring-[var(--color-warn-200)]",
        dotClass: "bg-[var(--color-warn-500)]",
      };
    case "resolved":
      return {
        label: "Resolved",
        pillClass:
          "bg-[var(--color-canvas-deep)] text-[var(--color-ink-600)] ring-1 ring-inset ring-[var(--color-ink-200)]",
        dotClass: "bg-[var(--color-ink-400)]",
      };
  }
}

export function formatChatDayLabel(iso: string): string {
  const messageDate = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(messageDate, today)) return "Today";
  if (sameDay(messageDate, yesterday)) return "Yesterday";
  return messageDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function groupChatMessagesByDay(
  messages: ChatMessage[],
): ChatMessageDayGroup[] {
  const groups: ChatMessageDayGroup[] = [];
  let current: ChatMessageDayGroup | undefined;
  for (const message of messages) {
    const day = formatChatDayLabel(message.createdAt);
    if (!current || current.day !== day) {
      current = { day, messages: [] };
      groups.push(current);
    }
    current.messages.push(message);
  }
  return groups;
}

export function ChatMessageDayDivider({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-[var(--radius-full)] bg-[var(--color-surface)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-ink-500)] shadow-[var(--shadow-sm)]">
        {label}
      </span>
    </div>
  );
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  /** Wider bubbles on full-page chat vs the floating widget. */
  variant?: "widget" | "page";
}

export function ChatMessageBubble({
  message,
  variant = "widget",
}: ChatMessageBubbleProps) {
  const isCustomer = message.author === "customer";
  const isAssistant = message.author === "assistant";
  const attachments = message.attachments ?? [];
  const maxWidth = variant === "page" ? "max-w-[min(560px,82%)]" : "max-w-[78%]";
  const teamLabel = isAssistant
    ? CHAT_SUPPORT_DISPLAY_NAME
    : message.authorName;

  return (
    <div
      className={classNames(
        "flex gap-2.5",
        isCustomer ? "justify-end" : "justify-start",
      )}
    >
      {!isCustomer && (
        <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent-300)] to-[var(--color-accent-500)] text-[11px] font-semibold text-[var(--color-ink-900)]">
          {(isAssistant ? "S" : (message.authorName ?? "T")).charAt(0).toUpperCase()}
        </span>
      )}
      <div
        className={classNames(
          maxWidth,
          "whitespace-pre-line rounded-[var(--radius-lg)] px-3.5 py-2.5 text-sm leading-relaxed shadow-[var(--shadow-sm)]",
          isCustomer
            ? "rounded-tr-sm bg-[var(--color-ink-900)] text-[var(--color-canvas)]"
            : "rounded-tl-sm border border-[var(--color-ink-100)] bg-[var(--color-surface)] text-[var(--color-ink-800)]",
        )}
      >
        {teamLabel && !isCustomer && (
          <p
            className={classNames(
              "mb-1 text-[10px] font-semibold uppercase tracking-wide",
              isAssistant
                ? "text-[var(--color-ink-700)]"
                : "text-[var(--color-ink-500)]",
            )}
          >
            {teamLabel}
          </p>
        )}
        {attachments.length > 0 && (
          <div className="mb-1.5 flex flex-col gap-1.5">
            {attachments.map((attachment, index) => (
              <ChatAttachmentPreview
                key={`${message.id}-att-${index}`}
                attachment={attachment}
              />
            ))}
          </div>
        )}
        {message.body.trim().length > 0 && <p>{message.body}</p>}
        <p
          className={classNames(
            "mt-1 text-[10px]",
            isCustomer ? "text-[var(--color-on-dark-soft)]" : "text-[var(--color-ink-500)]",
          )}
        >
          {new Date(message.createdAt).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function ChatAttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
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
