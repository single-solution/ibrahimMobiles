"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  X,
} from "lucide-react";

import {
  CHAT_GUEST_MESSAGE_LIMIT,
  CHAT_MESSAGE_BODY_MAX,
  formatTimeAgo,
  type ChatThread,
  type ChatThreadSummary,
} from "@store/shared";

import {
  ChatMessageBubble,
  ChatMessageDayDivider,
  chatWelcomeMessage,
  groupChatMessagesByDay,
} from "@/app/_components/chat/chatMessageUi";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";

export function statusLabel(status: ChatThread["status"]): string {
  switch (status) {
    case "open":
      return "Open — we'll reply soon";
    case "awaiting-customer":
      return "Waiting on you";
    case "resolved":
      return "Resolved · message us anytime to reopen";
  }
}

interface ChatShellProps {
  title: string;
  subtitle: string;
  onClose?: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}

export function ChatShell({
  title,
  subtitle,
  onClose,
  onBack,
  children,
}: ChatShellProps) {
  return (
    <div
      role="dialog"
      aria-label={`Chat with ${title}`}
      /* Anchored popover on every breakpoint — the widget appears to
         "lift" out of the floating FAB rather than take over the screen.
         Mobile keeps its own size band so the panel feels touch-sized
         without becoming a full-page modal. */
      className="animate-popover-in flex h-[min(70dvh,520px)] w-[min(360px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] md:h-[560px] md:w-[min(380px,calc(100vw-2rem))]"
    >
      <header className="flex items-center gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-ink-900)] px-3 py-3 text-[var(--color-on-dark)]">
        {onBack ? (
          <button
            type="button"
            aria-label="Back to thread list"
            onClick={onBack}
            className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] text-[var(--color-on-dark-soft)] transition-colors hover:bg-[var(--color-on-dark-10)] hover:text-[var(--color-on-dark)]"
          >
            <ArrowLeft size={16} />
          </button>
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent-300)] to-[var(--color-accent-500)] text-base font-semibold text-[var(--color-ink-900)]">
            <MessageSquare size={16} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          <p className="truncate text-[11px] leading-tight text-[var(--color-ink-300)]">
            {subtitle}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close chat"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-on-dark-soft)] transition-colors hover:bg-[var(--color-on-dark-10)] hover:text-[var(--color-on-dark)]"
          >
            <X size={16} />
          </button>
        )}
      </header>
      {children}
    </div>
  );
}


interface ThreadListProps {
  threads: ChatThreadSummary[];
  onOpen: (id: string) => void;
  onNew: () => void;
}

export function ThreadList({ threads, onOpen, onNew }: ThreadListProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-canvas-deep)] px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Your conversations
        </p>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--color-ink-900)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-on-dark)] transition-colors hover:bg-[var(--color-ink-800)]"
        >
          <Plus size={12} aria-hidden />
          New chat
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {threads.map((thread) => (
          <li key={thread.id}>
            <button
              type="button"
              onClick={() => onOpen(thread.id)}
              className="flex w-full flex-col gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-2.5 text-left shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--color-accent-50)]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
                  {thread.subjectProductName ?? thread.customerName}
                </span>
                <span className="shrink-0 text-[10px] text-[var(--color-ink-500)]">
                  {formatTimeAgo(thread.lastMessageAt)}
                </span>
              </div>
              <p className="truncate text-xs text-[var(--color-ink-600)]">
                {thread.lastMessagePreview || "No messages yet"}
              </p>
              {thread.unreadByCustomer > 0 && (
                <span className="inline-flex w-fit items-center rounded-full bg-[var(--color-accent-500)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-ink-900)]">
                  {thread.unreadByCustomer} new
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ThreadConversationProps {
  thread: ChatThread;
  onSend: (body: string) => Promise<void>;
  onAttach: (file: File, body?: string) => Promise<void>;
  attachmentsEnabled: boolean;
  initialDraft?: string;
  onDraftConsumed?: () => void;
  loginRequired: boolean;
  signInHref: string;
  previewMessagesLeft: number | null;
  welcomeMessageGuest?: string;
  welcomeMessageCustomer?: string;
}

export function ThreadConversation({
  thread,
  onSend,
  onAttach,
  attachmentsEnabled,
  initialDraft = "",
  onDraftConsumed,
  loginRequired,
  signInHref,
  previewMessagesLeft,
  welcomeMessageGuest,
  welcomeMessageCustomer,
}: ThreadConversationProps) {
  const messageListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDraft) {
      scheduleStateUpdate(() => {
        setDraft(initialDraft);
        onDraftConsumed?.();
      });
    }
  }, [initialDraft, onDraftConsumed]);

  const messages = thread.messages;
  const lastMessageId = messages[messages.length - 1]?.id;

  // Auto-scroll to the latest message whenever a new one lands. Only
  // when the user is already near the bottom to avoid yanking the view
  // away from someone reading older history.
  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lastMessageId]);

  const groupedMessages = useMemo(
    () => groupChatMessagesByDay(messages),
    [messages],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loginRequired || draft.trim().length === 0) return;
    const body = draft.trim();
    setSending(true);
    setError(null);
    setDraft("");
    try {
      await onSend(body);
    } catch (err) {
      setDraft(body);
      setError(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setSending(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || loginRequired) return;
    setUploading(true);
    setError(null);
    try {
      await onAttach(file, draft.trim() || undefined);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div
        ref={messageListRef}
        className="flex-1 space-y-3 overflow-y-auto bg-[var(--color-canvas-deep)] px-3 py-3"
      >
        {groupedMessages.map((group) => (
          <div key={group.day} className="space-y-2">
            <ChatMessageDayDivider label={group.day} />
            {group.messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-3.5 text-xs leading-relaxed text-[var(--color-ink-600)] shadow-[var(--shadow-sm)]">
            {chatWelcomeMessage({
              audience: thread.customerId ? "customer" : "guest",
              guestMessageLimit: CHAT_GUEST_MESSAGE_LIMIT,
              welcomeMessageGuest,
              welcomeMessageCustomer,
            })}
          </div>
        )}
      </div>
      {error && (
        <div className="border-t border-[var(--color-error-200)] bg-[var(--color-error-50)] px-3 py-1.5 text-[11px] text-[var(--color-error-700)]">
          {error}
        </div>
      )}
      {loginRequired ? (
        <ChatLoginGate signInHref={signInHref} />
      ) : (
        <>
          {previewMessagesLeft !== null && previewMessagesLeft <= 2 && (
            <p className="border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-3 py-1.5 text-center text-[10px] text-[var(--color-ink-500)]">
              {previewMessagesLeft === 1
                ? "Last preview message — sign in after this to continue."
                : `${previewMessagesLeft} preview messages left before sign-in.`}
            </p>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2.5"
          >
        {attachmentsEnabled && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
              hidden
              onChange={handleFileChange}
            />
            <button
              type="button"
              aria-label="Attach file"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="grid size-9 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-800)] disabled:opacity-40"
            >
              <Paperclip size={16} />
            </button>
          </>
        )}
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={uploading ? "Uploading…" : "Type a message"}
          aria-label="Type a message"
          maxLength={CHAT_MESSAGE_BODY_MAX}
          disabled={uploading}
          className="h-9 flex-1 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] px-3 text-sm text-[var(--color-ink-800)] placeholder:text-[var(--color-ink-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)] disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={sending || uploading || draft.trim().length === 0}
          className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-ink-900)] text-[var(--color-on-dark)] transition-opacity disabled:opacity-40"
        >
          <Send size={14} />
        </button>
          </form>
        </>
      )}
    </>
  );
}


interface ComposeConversationProps {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (body: string) => Promise<void>;
  welcomeMessage?: string;
  subjectProductName?: string;
  signInHref: string;
  isSignedInCustomer: boolean;
}

export function ComposeConversation({
  draft,
  onDraftChange,
  onSend,
  welcomeMessage,
  subjectProductName,
  signInHref,
  isSignedInCustomer,
}: ComposeConversationProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (draft.trim().length === 0 || sending) return;
    const body = draft.trim();
    setSending(true);
    setError(null);
    onDraftChange("");
    try {
      await onSend(body);
    } catch (err) {
      onDraftChange(body);
      setError(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--color-canvas-deep)] px-3 py-3">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-3.5 text-xs leading-relaxed text-[var(--color-ink-600)] shadow-[var(--shadow-sm)]">
          {welcomeMessage ??
            chatWelcomeMessage({
              audience: isSignedInCustomer ? "customer" : "guest",
              guestMessageLimit: CHAT_GUEST_MESSAGE_LIMIT,
            })}
          {subjectProductName ? (
            <p className="mt-2 font-semibold text-[var(--color-ink-800)]">
              About: {subjectProductName}
            </p>
          ) : null}
        </div>
      </div>
      {error ? (
        <div className="border-t border-[var(--color-error-200)] bg-[var(--color-error-50)] px-3 py-1.5 text-[11px] text-[var(--color-error-700)]">
          {error}
        </div>
      ) : null}
      {!isSignedInCustomer ? (
        <p className="border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-3 py-1.5 text-center text-[10px] text-[var(--color-ink-500)]">
          Guest preview —{" "}
          <Link href={signInHref} className="font-semibold text-[var(--color-accent-700)] underline">
            sign in
          </Link>{" "}
          after a few messages to continue.
        </p>
      ) : null}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2.5"
      >
        <input
          type="text"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Type your first message"
          aria-label="Type your first message"
          maxLength={CHAT_MESSAGE_BODY_MAX}
          disabled={sending}
          className="h-9 flex-1 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] px-3 text-sm text-[var(--color-ink-800)] placeholder:text-[var(--color-ink-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)] disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={sending || draft.trim().length === 0}
          className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-ink-900)] text-[var(--color-on-dark)] transition-opacity disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </form>
    </>
  );
}

interface SupportHintFooterProps {
  assistantEnabled: boolean;
}

function ChatLoginGate({ signInHref }: { signInHref: string }) {
  return (
    <div className="border-t border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-4">
      <p className="text-center text-sm font-medium text-[var(--color-ink-800)]">
        Sign in to keep chatting
      </p>
      <p className="mx-auto mt-1 max-w-prose text-center text-xs leading-relaxed text-[var(--color-ink-600)]">
        You&apos;ve used your {CHAT_GUEST_MESSAGE_LIMIT} free preview messages. Sign in to
        continue this conversation and get order updates.
      </p>
      <Link
        href={signInHref}
        className="mt-3 flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-sm font-semibold text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-accent-600)]"
      >
        Sign in
      </Link>
    </div>
  );
}

export function SupportHintFooter({ assistantEnabled }: SupportHintFooterProps) {
  return (
    <p className="mx-auto border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-4 py-2.5 text-center text-[11px] leading-relaxed text-[var(--color-ink-600)]">
      <span className="mx-auto block max-w-prose">
        {assistantEnabled
          ? 'Need to speak with our team? Type "speak to someone" and we will join this chat.'
          : "A teammate will reply here as soon as possible."}
      </span>
    </p>
  );
}
