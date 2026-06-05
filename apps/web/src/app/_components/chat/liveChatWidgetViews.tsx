"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Send, X } from "lucide-react";

import {
  CHAT_GUEST_MESSAGE_LIMIT,
  CHAT_MESSAGE_BODY_MAX,
  classNames,
  type ChatMessage,
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
 * Human pacing model for bot bubbles. A real support agent reads the incoming
 * message, understands it, then types each reply bubble at a believable speed.
 * We simulate both so the bot never dumps an instant wall of text.
 *
 * Typing: an average agent types ~200–260 characters per minute. We pick a
 * fresh rate per bubble (jitter) and clamp the result so a one-liner still
 * takes a beat and a long bubble never hangs the thread.
 *
 * Reading: skim-reading the customer's last message is faster (~1000 cpm)
 * plus a small fixed "understand it" beat. Applied once, before the first
 * bubble of a reply — subsequent bubbles only carry their own typing time.
 */
const TYPING_CHARS_PER_MIN_MIN = 220;
const TYPING_CHARS_PER_MIN_MAX = 300;
const TYPING_MIN_MS = 800;
const TYPING_MAX_MS = 6000;
const READING_CHARS_PER_MIN = 1000;
const COMPREHENSION_BASE_MS = 800;
const READING_MAX_MS = 4000;
/** Brief settle between a revealed bubble and the next typing pause. */
const STAGGER_GAP_MS = 250;

function typingDelay(text: string): number {
  const charsPerMin =
    TYPING_CHARS_PER_MIN_MIN +
    Math.random() * (TYPING_CHARS_PER_MIN_MAX - TYPING_CHARS_PER_MIN_MIN);
  const ms = (text.length / charsPerMin) * 60_000;
  return Math.max(TYPING_MIN_MS, Math.min(TYPING_MAX_MS, ms));
}

function readingDelay(text: string): number {
  // Simulate a busy agent: 30% chance they take an extra 1-3 seconds before they start reading
  const isBusy = Math.random() > 0.7;
  const busyDelay = isBusy ? 1000 + Math.random() * 2000 : 0;
  
  const ms = COMPREHENSION_BASE_MS + (text.length / READING_CHARS_PER_MIN) * 60_000 + busyDelay;
  return Math.min(ms, READING_MAX_MS + 3000); // Allow max to be higher if they are busy
}

/**
 * First-message bridge: shows the customer's just-sent bubble while the thread
 * is created in the background, so sending the very first message never feels
 * frozen behind a blank "Starting chat…" screen. The typing indicator only
 * appears when the AI assistant is on (it answers in seconds); a human can't
 * reply instantly, so faking "typing…" for human-only chat is misleading.
 */
export function StartingConversation({
  message,
}: {
  message: ChatMessage;
}) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--color-canvas-deep)] px-3 py-3">
      <ChatMessageBubble message={message} />
      <ChatTypingIndicator label="Connecting you with someone..." />
    </div>
  );
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
  initialDraft?: string;
  onDraftConsumed?: () => void;
  loginRequired: boolean;
  signInHref: string;
  previewMessagesLeft: number | null;
  guestMessageLimit: number;
  welcomeMessageGuest?: string;
  welcomeMessageCustomer?: string;
  assistantEnabled: boolean;
  hasMoreOlder: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
}

const LOAD_OLDER_SCROLL_THRESHOLD_PX = 80;

export function ThreadConversation({
  thread,
  onSend,
  initialDraft = "",
  onDraftConsumed,
  loginRequired,
  signInHref,
  previewMessagesLeft,
  guestMessageLimit,
  welcomeMessageGuest,
  welcomeMessageCustomer,
  assistantEnabled,
  hasMoreOlder,
  isLoadingOlder,
  onLoadOlder,
}: ThreadConversationProps) {
  const messageListRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [sending, setSending] = useState(false);
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
  // Reading/comprehension delay to prepend to the first bubble of a reply.
  const readDelayRef = useRef(0);
  const [, bumpReveal] = useReducer((count: number) => count + 1, 0);
  const [botTyping, setBotTyping] = useState(false);

  const visibleMessages = thread.messages.filter((message) =>
    revealedIdsRef.current.has(message.id),
  );
  const lastVisibleId = visibleMessages[visibleMessages.length - 1]?.id;
  const firstVisibleId = visibleMessages[0]?.id;

  const pump = useCallback(() => {
    const nextId = queueRef.current[0];
    if (nextId === undefined) {
      timerRef.current = null;
      setBotTyping(false);
      return;
    }
    const nextBody = messagesRef.current.find((message) => message.id === nextId)?.body ?? "";
    // The first bubble carries the one-time read/understand beat; the rest
    // only their own typing time.
    const startGap = readDelayRef.current;
    readDelayRef.current = 0;
    setBotTyping(true);
    timerRef.current = setTimeout(() => {
      queueRef.current.shift();
      revealedIdsRef.current.add(nextId);
      bumpReveal();
      setBotTyping(false);
      timerRef.current = setTimeout(() => pump(), STAGGER_GAP_MS);
    }, startGap + typingDelay(nextBody));
  }, []);

  useEffect(() => {
    const newOnes = thread.messages.filter(
      (message) =>
        !revealedIdsRef.current.has(message.id) &&
        !queueRef.current.includes(message.id),
    );
    if (newOnes.length === 0) return;

    // Newest already-revealed timestamp: messages older than this are a
    // prepended history page (scroll-up) and must show instantly, never paced.
    let latestRevealedAt = 0;
    for (const message of messagesRef.current) {
      if (revealedIdsRef.current.has(message.id)) {
        latestRevealedAt = Math.max(latestRevealedAt, new Date(message.createdAt).getTime());
      }
    }

    let revealedAny = false;
    for (const message of newOnes) {
      const isHistorical = new Date(message.createdAt).getTime() < latestRevealedAt;
      // Live assistant bubbles are paced (read + type); customer/agent messages
      // and any prepended history always show instantly.
      if (message.author === "assistant" && !isHistorical) {
        queueRef.current.push(message.id);
      } else {
        revealedIdsRef.current.add(message.id);
        revealedAny = true;
      }
    }
    if (revealedAny) bumpReveal();
    if (queueRef.current.length > 0 && !timerRef.current) {
      const lastCustomer = [...messagesRef.current]
        .reverse()
        .find((message) => message.author === "customer");
      readDelayRef.current = readingDelay(lastCustomer?.body ?? "");
      pump();
    }
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
  // Captured at the moment a scroll-up triggers an older-page load so the
  // viewport can be re-anchored after the prepended messages reflow.
  const olderAnchorRef = useRef<{ height: number; top: number } | null>(null);

  function handleMessageListScroll() {
    const el = messageListRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (
      el.scrollTop < LOAD_OLDER_SCROLL_THRESHOLD_PX &&
      hasMoreOlder &&
      !isLoadingOlder
    ) {
      olderAnchorRef.current = { height: el.scrollHeight, top: el.scrollTop };
      onLoadOlder();
    }
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

  // After an older page prepends, keep the viewport on the message the reader
  // was looking at by restoring the pre-load scroll offset.
  useLayoutEffect(() => {
    const el = messageListRef.current;
    const anchor = olderAnchorRef.current;
    if (!el || !anchor) return;
    el.scrollTop = el.scrollHeight - anchor.height + anchor.top;
    olderAnchorRef.current = null;
  }, [firstVisibleId]);

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

  return (
    <>
      <div
        ref={messageListRef}
        onScroll={handleMessageListScroll}
        className="flex-1 space-y-3 overflow-y-auto bg-[var(--color-canvas-deep)] px-3 py-3"
      >
        {(hasMoreOlder || isLoadingOlder) && (
          <div className="flex justify-center py-1">
            <span
              aria-label="Loading earlier messages"
              className={classNames(
                "block size-4 rounded-full border-2 border-[var(--color-ink-300)] border-r-transparent",
                isLoadingOlder ? "animate-spin" : "opacity-0",
              )}
            />
          </div>
        )}
        {groupedMessages.map((group) => (
          <div key={group.day} className="space-y-2">
            <ChatMessageDayDivider label={group.day} />
            {group.messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
          </div>
        ))}
        {assistantEnabled && botTyping && <ChatTypingIndicator />}
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
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message"
          aria-label="Type a message"
          maxLength={CHAT_MESSAGE_BODY_MAX}
          className="h-9 flex-1 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] px-3 text-sm text-[var(--color-ink-800)] placeholder:text-[var(--color-ink-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)] disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={sending || draft.trim().length === 0}
          className="tap grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-ink-900)] text-[var(--color-on-dark)] disabled:opacity-40"
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
