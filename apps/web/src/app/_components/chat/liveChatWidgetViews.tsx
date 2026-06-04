"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Paperclip, Send, X } from "lucide-react";

import {
  CHAT_GUEST_MESSAGE_LIMIT,
  CHAT_MESSAGE_BODY_MAX,
  type ChatThread,
} from "@store/shared";

import {
  ChatMessageBubble,
  ChatMessageDayDivider,
  ChatTypingIndicator,
  chatWelcomeMessage,
  groupChatMessagesByDay,
} from "@/app/_components/chat/chatMessageUi";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";

/**
 * Typing-pause bounds before each staggered bot bubble. Varies by bubble
 * length plus jitter so the rhythm feels human (sometimes quick, sometimes a
 * beat longer) while staying snappy — never a long, awkward wait.
 */
const STAGGER_MIN_MS = 350;
const STAGGER_MAX_MS = 2200;
/** Brief settle between a revealed bubble and the next typing pause. */
const STAGGER_GAP_MS = 130;

function staggerDelay(text: string): number {
  // Longer bubbles "type" longer (up to a cap) so a paragraph feels composed,
  // while quick one-liners stay snappy. Jitter keeps the rhythm human.
  const chars = Math.min(text.length, 220);
  const sized = 300 + chars * 9 + Math.random() * 260;
  return Math.max(STAGGER_MIN_MS, Math.min(STAGGER_MAX_MS, sized));
}

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
         Sized to match the cart dropdown so chat and cart feel like
         siblings, with mobile shrinking only when the viewport can't fit
         the desktop dimensions. */
      className="animate-popover-in flex h-[min(620px,calc(100dvh-var(--mobile-header-h)-var(--mobile-tabbar-h)-env(safe-area-inset-bottom,0px)-104px))] w-[min(440px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] md:h-[min(620px,calc(100dvh-var(--desktop-header-h)-32px))] md:w-[440px]"
    >
      <header className="flex items-center gap-3 border-b border-[var(--color-accent-200)] bg-[var(--color-accent-50)] px-3 py-3 text-[var(--color-ink-900)]">
        {onBack ? (
          <button
            type="button"
            aria-label="Back to thread list"
            onClick={onBack}
            className="tap grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-700)] hover:bg-[var(--color-ink-900)]/10 hover:text-[var(--color-ink-900)]"
          >
            <ArrowLeft size={16} />
          </button>
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-[var(--color-ink-900)] text-base font-semibold text-[var(--color-accent-500)]">
            <MessageSquare size={16} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          <p className="truncate text-[11px] leading-tight text-[var(--color-ink-700)]">
            {subtitle}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close chat"
            onClick={onClose}
            className="tap grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-700)] hover:bg-[var(--color-ink-900)]/10 hover:text-[var(--color-ink-900)]"
          >
            <X size={16} />
          </button>
        )}
      </header>
      {children}
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
  guestMessageLimit: number;
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
  guestMessageLimit,
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

  // ── Staggered reveal ──────────────────────────────────────────────────────
  // The bot can answer in several bubbles. To feel like real texting, reveal
  // the first bubble immediately, then drip the rest one at a time with a
  // typing pause between. Customer/agent messages always show instantly.
  const messagesRef = useRef(thread.messages);
  messagesRef.current = thread.messages;
  const revealedIdsRef = useRef<Set<string>>(
    new Set(thread.messages.map((message) => message.id)),
  );
  const queueRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, bumpReveal] = useReducer((count: number) => count + 1, 0);
  const [botTyping, setBotTyping] = useState(false);

  const visibleMessages = thread.messages.filter((message) =>
    revealedIdsRef.current.has(message.id),
  );
  const lastVisibleId = visibleMessages[visibleMessages.length - 1]?.id;

  const pump = useCallback(() => {
    const nextId = queueRef.current[0];
    if (nextId === undefined) {
      timerRef.current = null;
      setBotTyping(false);
      return;
    }
    const nextBody = messagesRef.current.find((message) => message.id === nextId)?.body ?? "";
    setBotTyping(true);
    timerRef.current = setTimeout(() => {
      queueRef.current.shift();
      revealedIdsRef.current.add(nextId);
      bumpReveal();
      setBotTyping(false);
      timerRef.current = setTimeout(() => pump(), STAGGER_GAP_MS);
    }, staggerDelay(nextBody));
  }, []);

  useEffect(() => {
    const newOnes = thread.messages.filter(
      (message) =>
        !revealedIdsRef.current.has(message.id) &&
        !queueRef.current.includes(message.id),
    );
    if (newOnes.length === 0) return;

    let assistantShown = queueRef.current.length > 0;
    let revealedAny = false;
    for (const message of newOnes) {
      if (message.author === "assistant" && assistantShown) {
        queueRef.current.push(message.id);
      } else {
        revealedIdsRef.current.add(message.id);
        revealedAny = true;
        if (message.author === "assistant") assistantShown = true;
      }
    }
    if (revealedAny) bumpReveal();
    if (queueRef.current.length > 0 && !timerRef.current) pump();
  }, [thread.messages, pump]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // Whether the reader was near the bottom *before* the latest message
  // arrived. Measuring after render fails for tall replies (a long bot
  // answer pushes the new distance past any threshold), so we record it
  // from scroll events instead and default to pinned.
  const stickToBottomRef = useRef(true);

  function handleMessageListScroll() {
    const el = messageListRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  // New bubble (or typing dots) landed: snap to bottom if already pinned.
  // rAF lets attachment/image reflow settle before we measure scrollHeight.
  useEffect(() => {
    const el = messageListRef.current;
    if (!el || !stickToBottomRef.current) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [lastVisibleId, sending, botTyping]);

  // Opening a thread (or switching threads) reveals all history instantly and
  // jumps to the newest message.
  useEffect(() => {
    revealedIdsRef.current = new Set(messagesRef.current.map((message) => message.id));
    queueRef.current = [];
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setBotTyping(false);
    bumpReveal();
    const el = messageListRef.current;
    if (!el) return;
    stickToBottomRef.current = true;
    el.scrollTop = el.scrollHeight;
  }, [thread.id]);

  const groupedMessages = groupChatMessagesByDay(visibleMessages);

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
        onScroll={handleMessageListScroll}
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
        {(sending || botTyping) && <ChatTypingIndicator />}
        {thread.messages.length === 0 && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-3.5 text-xs leading-relaxed text-[var(--color-ink-600)] shadow-[var(--shadow-sm)]">
            {chatWelcomeMessage({
              audience: thread.customerId ? "customer" : "guest",
              guestMessageLimit,
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
              className="tap grid size-9 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-800)] disabled:opacity-40"
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
          className="tap grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-ink-900)] text-[var(--color-on-dark)] disabled:opacity-40"
        >
          {uploading ? (
            <span className="block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
          ) : (
            <Send size={14} />
          )}
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
  guestMessageLimit: number;
}

export function ComposeConversation({
  draft,
  onDraftChange,
  onSend,
  welcomeMessage,
  subjectProductName,
  signInHref,
  isSignedInCustomer,
  guestMessageLimit,
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
              guestMessageLimit,
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
          className="tap grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-ink-900)] text-[var(--color-on-dark)] disabled:opacity-40"
        >
          {sending ? (
            <span className="block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
          ) : (
            <Send size={14} />
          )}
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
        className="tap mt-3 flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-sm font-semibold text-[var(--color-ink-900)] hover:bg-[var(--color-accent-600)]"
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
