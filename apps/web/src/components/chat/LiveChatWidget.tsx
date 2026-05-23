"use client";

/**
 * Real-time chat widget for the storefront.
 *
 * Modes:
 *   - "loading"  — bootstrap fetch in flight.
 *   - "disabled" — admin toggled chat.enabled = false; render nothing.
 *   - "start"    — no existing threads; show name / message form.
 *   - "list"     — multiple threads; show summary list with pick CTA.
 *   - "thread"   — focused conversation; messages + composer.
 *
 * Polling strategy follows `ChatSettings`:
 *   - Tab focused → `pollIntervalMsFocused` (default 5s).
 *   - Tab blurred → `pollIntervalMsBlurred` (default 30s).
 *
 * Optimistic sends append a `local-…` id immediately so the bubble
 * appears in <16ms; the server's reply replaces the optimistic
 * message with the persisted version.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, MessageSquare, Paperclip, Send, Sparkles, X } from "lucide-react";

import {
  CHAT_CUSTOMER_NAME_MAX,
  CHAT_MESSAGE_BODY_MAX,
  buildWhatsAppLink,
  classNames,
  createChatTransport,
  formatTimeAgo,
  type ChatAttachment,
  type ChatMessage,
  type ChatThread,
  type ChatThreadSummary,
} from "@store/shared";

import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";
import type { ChatSettings } from "@/lib/chat/chatSettings";
import type { OpenChatDetail } from "@/lib/chat/openChat";
import {
  fetchChatBootstrap,
  fetchChatThread,
  markChatThreadRead,
  pollChatThread,
  makeOptimisticMessage,
  sendChatMessage,
  startChatThread,
  uploadChatAttachment,
} from "@/lib/chat/transport";

type WidgetView = "list" | "start" | "thread";

interface LiveChatWidgetProps {
  onCollapse?: () => void;
  initialOpenDetail?: OpenChatDetail | null;
}

export function LiveChatWidget({
  onCollapse,
  initialOpenDetail = null,
}: LiveChatWidgetProps) {
  const { siteName, whatsappNumber } = useStoreSettings();
  const [bootstrapLoaded, setBootstrapLoaded] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [view, setView] = useState<WidgetView>("list");
  const [startDefaults, setStartDefaults] = useState<OpenChatDetail | null>(
    initialOpenDetail,
  );
  const lastActivityAtRef = useRef(0);
  const activeThreadIdRef = useRef<string | null>(null);
  const activeThreadRef = useRef<ChatThread | null>(null);
  const baseTitleRef = useRef<string | null>(null);

  useEffect(() => {
    lastActivityAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
    activeThreadRef.current = activeThread;
  }, [activeThreadId, activeThread]);

  const refreshBootstrap = useCallback(async () => {
    try {
      const data = await fetchChatBootstrap();
      setEnabled(data.enabled);
      setSettings(data.settings);
      setThreads(data.threads);
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to load chat.";
      setBootstrapError(msg);
      return null;
    }
  }, []);

  // Initial bootstrap.
  useEffect(() => {
    void (async () => {
      const data = await refreshBootstrap();
      setBootstrapLoaded(true);
      if (!data) return;
      if (initialOpenDetail?.initialBody) {
        setStartDefaults(initialOpenDetail);
        setView("start");
      } else if (data.threads.length === 0) {
        setView("start");
      } else if (data.threads.length === 1) {
        setActiveThreadId(data.threads[0].id);
        setView("thread");
      } else {
        setView("list");
      }
    })();
  }, [refreshBootstrap, initialOpenDetail]);

  // Open the chosen thread whenever activeThreadId changes.
  useEffect(() => {
    if (!activeThreadId) return;
    let cancelled = false;
    void (async () => {
      try {
        const thread = await fetchChatThread(activeThreadId);
        if (!cancelled) setActiveThread(thread);
      } catch {
        if (!cancelled) setActiveThread(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeThreadId]);

  useEffect(() => {
    if (!settings) return;
    const transport = createChatTransport({
      pollIntervalMsFocused: settings.pollIntervalMsFocused,
      pollIntervalMsBlurred: settings.pollIntervalMsBlurred,
      onTick: async () => {
        const bootstrap = await fetchChatBootstrap();
        setThreads(bootstrap.threads);
        const threadId = activeThreadIdRef.current;
        if (!threadId) return;
        const since =
          activeThreadRef.current?.lastMessageAt ??
          bootstrap.threads.find((t) => t.id === threadId)?.lastMessageAt;
        if (since) {
          const prevLen = activeThreadRef.current?.messages.length ?? 0;
          const fresh = await pollChatThread(threadId, since, `"${since}"`);
          if (fresh) {
            const newAgent = fresh.messages
              .slice(prevLen)
              .some((m) => m.author === "agent");
            if (newAgent && document.hidden) {
              if (!baseTitleRef.current) baseTitleRef.current = document.title;
              document.title = `*New message · ${siteName}`;
            }
            lastActivityAtRef.current = Date.now();
            transport.touch();
            setActiveThread(fresh);
            void markChatThreadRead(threadId);
          }
        } else {
          const fresh = await fetchChatThread(threadId);
          setActiveThread(fresh);
          void markChatThreadRead(threadId);
        }
      },
    });
    transport.start();
    return () => {
      transport.stop();
      if (baseTitleRef.current) {
        document.title = baseTitleRef.current;
        baseTitleRef.current = null;
      }
    };
  }, [settings, siteName]);

  function handleOpenThread(id: string) {
    setActiveThreadId(id);
    setView("thread");
  }

  function handleBackToList() {
    setActiveThreadId(null);
    setActiveThread(null);
    setView(threads.length > 0 ? "list" : "start");
  }

  async function handleStartThread(input: {
    customerName: string;
    phoneNumber: string;
    body: string;
  }) {
    const thread = await startChatThread({
      ...input,
      subjectProductId: startDefaults?.subjectProductId,
      subjectProductName: startDefaults?.subjectProductName,
    });
    lastActivityAtRef.current = Date.now();
    setActiveThread(thread);
    setActiveThreadId(thread.id);
    setView("thread");
    void refreshBootstrap();
  }

  async function handleAttach(file: File, body?: string) {
    if (!activeThread) return;
    const fresh = await uploadChatAttachment(activeThread.id, file, body);
    lastActivityAtRef.current = Date.now();
    setActiveThread(fresh);
    void refreshBootstrap();
  }

  async function handleSend(body: string) {
    if (!activeThread) return;
    const optimistic = makeOptimisticMessage({
      body,
      authorName: activeThread.customerName,
    });
    lastActivityAtRef.current = Date.now();
    setActiveThread({
      ...activeThread,
      messages: [...activeThread.messages, optimistic],
      lastMessageAt: optimistic.createdAt,
      lastMessagePreview: body.slice(0, 280),
      lastMessageAuthor: "customer",
    });
    try {
      const fresh = await sendChatMessage(activeThread.id, body);
      lastActivityAtRef.current = Date.now();
      setActiveThread(fresh);
      void refreshBootstrap();
    } catch (error) {
      setActiveThread((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== optimistic.id),
            }
          : prev,
      );
      throw error;
    }
  }

  if (!bootstrapLoaded) {
    return (
      <ChatShell onClose={onCollapse} title={siteName} subtitle="Connecting…">
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-ink-500)]">
          Loading chat…
        </div>
      </ChatShell>
    );
  }

  if (!enabled) {
    return (
      <ChatShell onClose={onCollapse} title={siteName} subtitle="Chat is offline">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-[var(--color-ink-500)]">
          <p>Chat is currently disabled. Please reach us on WhatsApp.</p>
          <a
            href={buildWhatsAppLink("Salam!", whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[var(--radius-md)] bg-[var(--color-accent-700)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-accent-800)]"
          >
            Open WhatsApp
          </a>
        </div>
      </ChatShell>
    );
  }

  return (
    <ChatShell
      onClose={onCollapse}
      title={siteName}
      subtitle={
        view === "thread" && activeThread
          ? statusLabel(activeThread.status)
          : "We typically reply within an hour"
      }
      onBack={view === "thread" && threads.length > 1 ? handleBackToList : undefined}
    >
      {bootstrapError && (
        <div className="border-b border-[var(--color-error-200)] bg-[var(--color-error-50)] px-4 py-2 text-xs text-[var(--color-error-700)]">
          {bootstrapError}
        </div>
      )}
      {view === "start" && (
        <StartThreadForm
          onStart={handleStartThread}
          defaultBody={startDefaults?.initialBody}
        />
      )}
      {view === "list" && (
        <ThreadList
          threads={threads}
          onOpen={handleOpenThread}
          onStartNew={() => setView("start")}
        />
      )}
      {view === "thread" && activeThread && (
        <ThreadConversation
          thread={activeThread}
          onSend={handleSend}
          onAttach={handleAttach}
          attachmentsEnabled={Boolean(settings?.attachmentsEnabled)}
        />
      )}
      <EscalationFooter whatsappNumber={whatsappNumber} />
    </ChatShell>
  );
}

function statusLabel(status: ChatThread["status"]): string {
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

function ChatShell({ title, subtitle, onClose, onBack, children }: ChatShellProps) {
  return (
    <div
      role="dialog"
      aria-label={`Chat with ${title}`}
      className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden bg-[var(--color-surface)] md:static md:h-[560px] md:w-[min(380px,calc(100vw-2rem))] md:rounded-[var(--radius-xl)] md:border md:border-[var(--color-ink-100)] md:shadow-[var(--shadow-lg)]"
    >
      <header className="flex items-center gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-ink-900)] px-3 py-3 text-white">
        {onBack ? (
          <button
            type="button"
            aria-label="Back to thread list"
            onClick={onBack}
            className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} />
          </button>
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-700)] text-base font-semibold">
            <MessageSquare size={16} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
            {title}
            <Sparkles size={11} className="text-[var(--color-accent-300)]" />
          </p>
          <p className="truncate text-[11px] leading-tight text-[var(--color-ink-300)]">
            {subtitle}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close chat"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </header>
      {children}
    </div>
  );
}

interface StartThreadFormProps {
  onStart: (input: {
    customerName: string;
    phoneNumber: string;
    body: string;
  }) => Promise<void>;
  defaultBody?: string;
}

function StartThreadForm({ onStart, defaultBody = "" }: StartThreadFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [body, setBody] = useState(defaultBody);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onStart({
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        body: body.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start chat.");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled =
    submitting ||
    customerName.trim().length < 2 ||
    phoneNumber.trim().length < 7 ||
    body.trim().length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[var(--color-canvas-deep)] px-4 py-4"
    >
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-4 py-3 text-xs text-[var(--color-ink-600)] shadow-[var(--shadow-sm)]">
        Salam! Tell us your full name and what you&apos;d like help with — our
        team replies as soon as possible.
      </div>
      <label className="text-xs font-medium text-[var(--color-ink-700)]">
        Full name
        <input
          type="text"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          required
          minLength={2}
          maxLength={CHAT_CUSTOMER_NAME_MAX}
          placeholder="e.g. Ahmed Khan"
          autoComplete="name"
          className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink-800)] focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-300)]"
        />
      </label>
      <label className="text-xs font-medium text-[var(--color-ink-700)]">
        Phone number
        <input
          type="tel"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          required
          minLength={7}
          maxLength={32}
          placeholder="03xx-xxxxxxx"
          autoComplete="tel"
          className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink-800)] focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-300)]"
        />
      </label>
      <label className="text-xs font-medium text-[var(--color-ink-700)]">
        Message
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
          maxLength={CHAT_MESSAGE_BODY_MAX}
          rows={4}
          placeholder="How can we help?"
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink-800)] focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-300)]"
        />
      </label>
      {error && <div className="text-xs text-[var(--color-error-700)]">{error}</div>}
      <button
        type="submit"
        disabled={disabled}
        className="mt-1 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-700)] text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-800)] disabled:opacity-40"
      >
        {submitting ? "Sending…" : "Start chat"}
      </button>
    </form>
  );
}

interface ThreadListProps {
  threads: ChatThreadSummary[];
  onOpen: (id: string) => void;
  onStartNew: () => void;
}

function ThreadList({ threads, onOpen, onStartNew }: ThreadListProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-canvas-deep)] px-3 py-3">
      <button
        type="button"
        onClick={onStartNew}
        className="mb-3 w-full rounded-[var(--radius-md)] border border-dashed border-[var(--color-accent-500)] bg-[var(--color-accent-50)] px-3 py-2 text-xs font-semibold text-[var(--color-accent-800)] transition-colors hover:bg-[var(--color-accent-100)]"
      >
        + Start a new conversation
      </button>
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
                <span className="inline-flex w-fit items-center rounded-full bg-[var(--color-accent-700)] px-2 py-0.5 text-[10px] font-semibold text-white">
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
}

function ThreadConversation({
  thread,
  onSend,
  onAttach,
  attachmentsEnabled,
}: ThreadConversationProps) {
  const messageListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const groupedMessages = useMemo(() => groupByDay(messages), [messages]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (draft.trim().length === 0) return;
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
    if (!file) return;
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
            <div className="flex justify-center">
              <span className="rounded-[var(--radius-full)] bg-[var(--color-surface)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                {group.day}
              </span>
            </div>
            {group.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-xs text-[var(--color-ink-500)]">
            No messages yet.
          </div>
        )}
      </div>
      {error && (
        <div className="border-t border-[var(--color-error-200)] bg-[var(--color-error-50)] px-3 py-1.5 text-[11px] text-[var(--color-error-700)]">
          {error}
        </div>
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
          className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-ink-900)] text-white transition-opacity disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </form>
    </>
  );
}

interface DayGroup {
  day: string;
  messages: ChatMessage[];
}

function groupByDay(messages: ChatMessage[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let current: DayGroup | undefined;
  for (const message of messages) {
    const day = dayLabel(message.createdAt);
    if (!current || current.day !== day) {
      current = { day, messages: [] };
      groups.push(current);
    }
    current.messages.push(message);
  }
  return groups;
}

function dayLabel(iso: string): string {
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isCustomer = message.author === "customer";
  const attachments = message.attachments ?? [];
  return (
    <div
      className={classNames(
        "flex gap-2",
        isCustomer ? "justify-end" : "justify-start",
      )}
    >
      {!isCustomer && (
        <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-700)] text-[11px] font-semibold text-white">
          {(message.authorName ?? "T").charAt(0).toUpperCase()}
        </span>
      )}
      <div
        className={classNames(
          "max-w-[78%] whitespace-pre-line rounded-[var(--radius-lg)] px-3.5 py-2.5 text-sm leading-relaxed shadow-[var(--shadow-sm)]",
          isCustomer
            ? "rounded-tr-sm bg-[var(--color-ink-900)] text-[var(--color-canvas)]"
            : "rounded-tl-sm bg-[var(--color-surface)] text-[var(--color-ink-800)]",
        )}
      >
        {message.authorName && !isCustomer && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
            {message.authorName}
          </p>
        )}
        {attachments.length > 0 && (
          <div className="mb-1.5 flex flex-col gap-1.5">
            {attachments.map((attachment, index) => (
              <AttachmentPreview
                key={`${message.id}-att-${index}`}
                attachment={attachment}
              />
            ))}
          </div>
        )}
        <p>{message.body}</p>
        <p
          className={classNames(
            "mt-1 text-[10px]",
            isCustomer ? "text-white/60" : "text-[var(--color-ink-500)]",
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

function AttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.kind === "image") {
    const thumb = attachment.image.variants.thumb || attachment.image.variants.card;
    const full = attachment.image.variants.full || attachment.image.variants.detail;
    return (
      <a
        href={full}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-[200px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)]"
      >
        <Image
          src={thumb}
          width={200}
          height={200}
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
      className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-800)] hover:bg-[var(--color-accent-50)]"
    >
      <Paperclip size={12} />
      <span className="max-w-[160px] truncate">{attachment.filename}</span>
      <span className="text-[10px] text-[var(--color-ink-500)]">
        {sizeKb} KB
      </span>
    </a>
  );
}

interface EscalationFooterProps {
  whatsappNumber: string;
}

function EscalationFooter({ whatsappNumber }: EscalationFooterProps) {
  return (
    <a
      href={buildWhatsAppLink("Salam!", whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      className="border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-4 py-2.5 text-center text-xs text-[var(--color-ink-600)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink-900)]"
    >
      Prefer WhatsApp? <span className="font-semibold text-[var(--color-whatsapp-dark)]">Open chat →</span>
    </a>
  );
}
