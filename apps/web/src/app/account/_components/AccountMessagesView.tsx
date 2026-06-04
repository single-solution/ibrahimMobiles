"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Headset,
  MessageSquare,
  Paperclip,
  Send,
} from "lucide-react";

import {
  CHAT_MESSAGE_BODY_MAX,
  classNames,
  createChatTransport,
  formatTimeAgo,
  type ChatThread,
  type ChatThreadSummary,
} from "@store/shared";

import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { useNavigationTransition } from "@/lib/navigation/navigationProgress";

import {
  ChatMessageBubble,
  ChatMessageDayDivider,
  chatStatusMeta,
  chatThreadTitle,
  chatWelcomeMessage,
  groupChatMessagesByDay,
} from "@/app/_components/chat/chatMessageUi";
import { Button } from "@store/ui";
import { useChatSettings } from "@/lib/chat/chatSettingsContext";
import { openChatWidget } from "@/lib/chat/openChat";
import {
  fetchChatBootstrap,
  fetchChatThread,
  markChatThreadRead,
  pollChatThread,
  sendChatMessage,
  startCustomerChatThread,
  uploadChatAttachment,
} from "@/lib/chat/transport";

interface AccountMessagesViewProps {
  initialThreadId?: string;
}

export function AccountMessagesView({ initialThreadId }: AccountMessagesViewProps) {
  const router = useRouter();
  const { startNavigation } = useNavigationTransition();
  const chatSettings = useChatSettings();
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialThreadId ?? null);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const pollCursorRef = useRef<string | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const data = await fetchChatBootstrap();
    setThreads(data.threads);
    const hasInitialThread =
      initialThreadId && data.threads.some((thread) => thread.id === initialThreadId);
    if (data.threads.length > 0 && !activeId && !hasInitialThread) {
      const preferDesktop =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 40rem)").matches;
      if (preferDesktop) {
        setActiveId(data.threads[0].id);
      }
    }
    return data;
  }, [activeId, initialThreadId]);

  useEffect(() => {
    void (async () => {
      try {
        await loadThreads();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load messages.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadThreads]);

  useEffect(() => {
    if (initialThreadId) {
      scheduleStateUpdate(() => {
        setActiveId(initialThreadId);
      });
    }
  }, [initialThreadId]);

  useEffect(() => {
    if (!activeId) {
      scheduleStateUpdate(() => {
        setActiveThread(null);
      });
      return;
    }
    void (async () => {
      try {
        const thread = await fetchChatThread(activeId);
        pollCursorRef.current = thread.lastMessageAt;
        setActiveThread(thread);
        if (thread.unreadByCustomer > 0) {
          await markChatThreadRead(thread.id);
          await loadThreads();
        }
      } catch {
        setActiveThread(null);
      }
    })();
  }, [activeId, loadThreads]);

  useEffect(() => {
    if (!activeId || !activeThread) return;
    const threadId = activeId;
    const initialLastMessageAt = activeThread.lastMessageAt;
    const transport = createChatTransport({
      pollIntervalMsFocused: chatSettings.pollIntervalMsFocused,
      pollIntervalMsBlurred: chatSettings.pollIntervalMsBlurred,
      onTick: async () => {
        const since = pollCursorRef.current ?? initialLastMessageAt;
        const fresh = await pollChatThread(threadId, since, `"${since}"`);
        if (!fresh) return;
        pollCursorRef.current = fresh.lastMessageAt;
        setActiveThread(fresh);
        if (fresh.unreadByCustomer > 0) {
          await markChatThreadRead(fresh.id);
          await loadThreads();
        }
      },
    });
    transport.start();
    return () => transport.stop();
  }, [
    activeId,
    activeThread,
    chatSettings.pollIntervalMsBlurred,
    chatSettings.pollIntervalMsFocused,
    loadThreads,
  ]);

  const groupedMessages = useMemo(
    () => groupChatMessagesByDay(activeThread?.messages ?? []),
    [activeThread?.messages],
  );

  const lastMessageId = activeThread?.messages.at(-1)?.id;

  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lastMessageId, activeId]);

  async function handleFirstMessage(event: React.FormEvent) {
    event.preventDefault();
    if (draft.trim().length === 0 || sending) return;
    const body = draft.trim();
    setSending(true);
    setError(null);
    setDraft("");
    try {
      const thread = await startCustomerChatThread();
      setActiveId(thread.id);
      const fresh = await sendChatMessage(thread.id, body);
      setActiveThread(fresh);
      await loadThreads();
      const messagesUrl = `/account/messages/${thread.id}`;
      startNavigation(() => router.replace(messagesUrl));
    } catch (err) {
      setDraft(body);
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!activeId || draft.trim().length === 0 || sending) return;
    const body = draft.trim();
    setSending(true);
    setDraft("");
    try {
      const fresh = await sendChatMessage(activeId, body);
      setActiveThread(fresh);
      void loadThreads();
    } catch (err) {
      setDraft(body);
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function handleAttach(file: File, body?: string) {
    if (!activeId || sending) return;
    setSending(true);
    setError(null);
    try {
      const fresh = await uploadChatAttachment(activeId, file, body);
      setActiveThread(fresh);
      if (body) setDraft("");
      void loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send attachment.");
    } finally {
      setSending(false);
    }
  }

  function handleSelectThread(id: string) {
    setActiveId(id);
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 40rem)").matches) {
      const url = `/account/messages/${id}`;
      startNavigation(() => router.push(url));
    }
  }

  function handleBackToList() {
    setActiveId(null);
    setActiveThread(null);
    startNavigation(() => router.push("/account/messages"));
  }

  const unreadTotal = threads.reduce((sum, thread) => sum + thread.unreadByCustomer, 0);

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8">
      <MessagesBreadcrumbs activeThread={activeThread} />

      <header className="reveal mt-4 md:mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
          Support
        </p>
        <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-headline text-page-title font-semibold text-[var(--color-ink-900)]">
              Messages
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--color-ink-500)] md:text-sm">
              Your conversations with our team — product questions, orders, and anything
              in between.
            </p>
          </div>
          {!loading && threads.length > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-ink-700)] shadow-[var(--shadow-sm)]">
              <Headset size={13} className="text-[var(--color-accent-700)]" />
              {threads.length} thread{threads.length === 1 ? "" : "s"}
              {unreadTotal > 0 && (
                <span className="rounded-full bg-[var(--color-accent-500)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-ink-900)]">
                  {unreadTotal} new
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {loading ? (
        <MessagesSkeleton />
      ) : error && threads.length === 0 ? (
        <ErrorPanel message={error} />
      ) : threads.length === 0 ? (
        <NewConversationPanel
          draft={draft}
          sending={sending}
          error={error}
          onDraftChange={setDraft}
          onSubmit={handleFirstMessage}
          welcomeMessageCustomer={chatSettings.welcomeMessageCustomer}
        />
      ) : (
        <div className="reveal-rise mt-6 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] md:mt-8">
          <div className="grid min-h-[min(72vh,680px)] md:grid-cols-[minmax(280px,340px)_1fr]">
            <ThreadSidebar
              threads={threads}
              activeId={activeId}
              onSelect={handleSelectThread}
              hiddenOnMobile={Boolean(activeId)}
            />

            <ConversationPane
              thread={activeThread}
              draft={draft}
              sending={sending}
              groupedMessages={groupedMessages}
              messageListRef={messageListRef}
              onDraftChange={setDraft}
              onSubmit={handleSend}
              onAttach={handleAttach}
              attachmentsEnabled={chatSettings.attachmentsEnabled}
              onBack={handleBackToList}
              hiddenOnMobile={!activeId}
              error={error}
              welcomeMessageCustomer={chatSettings.welcomeMessageCustomer}
            />
          </div>
        </div>
      )}

      {!loading && (
        <p className="mt-6 text-center text-[12px] text-[var(--color-ink-500)] md:text-left">
          Need help right now?{" "}
          <button
            type="button"
            onClick={() => openChatWidget()}
            className="tap font-semibold text-[var(--color-accent-700)] hover:underline"
          >
            Open live chat
          </button>{" "}
          from any page, or{" "}
          <Link href="/account" className="font-semibold text-[var(--color-accent-700)] hover:underline">
            return to your account
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function MessagesBreadcrumbs({
  activeThread,
}: {
  activeThread: ChatThread | null;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden items-center gap-1.5 text-sm text-[var(--color-ink-500)] md:flex"
    >
        <Link href="/account" className="tap hover:text-[var(--color-ink-800)]">
          Account
        </Link>
        <ChevronRight size={14} aria-hidden />
        <Link href="/account/messages" className="tap hover:text-[var(--color-ink-800)]">
          Messages
        </Link>
        {activeThread && (
          <>
            <ChevronRight size={14} aria-hidden />
            <span className="truncate text-[var(--color-ink-800)]">
              {chatThreadTitle(activeThread)}
            </span>
          </>
        )}
    </nav>
  );
}

interface ThreadSidebarProps {
  threads: ChatThreadSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  hiddenOnMobile: boolean;
}

function ThreadSidebar({
  threads,
  activeId,
  onSelect,
  hiddenOnMobile,
}: ThreadSidebarProps) {
  return (
    <aside
      className={classNames(
        "flex flex-col border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/50 md:border-b-0 md:border-r",
        hiddenOnMobile ? "hidden md:flex" : "flex",
      )}
    >
      <div className="border-b border-[var(--color-ink-100)] px-4 py-4 md:px-5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
          Inbox
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
          Your conversations
        </p>
      </div>

      <ul className="sheet-stagger flex-1 space-y-1 overflow-y-auto p-2 md:p-3">
        {threads.map((thread) => {
          const isActive = thread.id === activeId;
          const status = chatStatusMeta(thread.status);
          const title = chatThreadTitle(thread);
          return (
            <li key={thread.id}>
              <button
                type="button"
                onClick={() => onSelect(thread.id)}
                className={classNames(
                  "tap flex w-full gap-3 rounded-[var(--radius-lg)] px-3 py-3 text-left",
                  isActive
                    ? "bg-[var(--color-surface)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-accent-200)]"
                    : "hover:bg-[var(--color-surface)]/80",
                )}
              >
                <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent-300)] to-[var(--color-accent-500)] text-sm font-semibold text-[var(--color-ink-900)]">
                  {title.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-[var(--color-ink-900)]">
                      {title}
                    </span>
                    <span className="shrink-0 text-[10px] text-[var(--color-ink-400)]">
                      {formatTimeAgo(thread.lastMessageAt)}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span
                      className={classNames(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        status.pillClass,
                      )}
                    >
                      <span className={classNames("size-1.5 rounded-full", status.dotClass)} />
                      {status.label}
                    </span>
                    {thread.unreadByCustomer > 0 && (
                      <span className="rounded-full bg-[var(--color-accent-500)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-ink-900)]">
                        {thread.unreadByCustomer}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-[12px] text-[var(--color-ink-500)]">
                    {thread.lastMessagePreview || "No messages yet"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

interface ConversationPaneProps {
  thread: ChatThread | null;
  draft: string;
  sending: boolean;
  groupedMessages: ReturnType<typeof groupChatMessagesByDay>;
  messageListRef: React.RefObject<HTMLDivElement | null>;
  onDraftChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onAttach: (file: File, body?: string) => Promise<void>;
  attachmentsEnabled: boolean;
  onBack: () => void;
  hiddenOnMobile: boolean;
  error: string | null;
  welcomeMessageCustomer?: string;
}

function ConversationPane({
  thread,
  draft,
  sending,
  groupedMessages,
  messageListRef,
  onDraftChange,
  onSubmit,
  onAttach,
  attachmentsEnabled,
  onBack,
  hiddenOnMobile,
  error,
  welcomeMessageCustomer,
}: ConversationPaneProps) {
  if (!thread) {
    return (
      <section
        className={classNames(
          "hidden min-h-[420px] flex-col items-center justify-center bg-[var(--color-canvas)] px-6 text-center md:flex",
          hiddenOnMobile && "md:flex",
        )}
      >
        <span className="grid size-14 place-items-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
          <MessageSquare size={24} />
        </span>
        <p className="mt-4 text-base font-semibold text-[var(--color-ink-900)]">
          Select a conversation
        </p>
        <p className="mt-1 max-w-sm text-sm text-[var(--color-ink-500)]">
          Choose a thread from the inbox to read messages and continue chatting with our
          team.
        </p>
      </section>
    );
  }

  const status = chatStatusMeta(thread.status);
  const title = chatThreadTitle(thread);

  return (
    <section
      className={classNames(
        "flex min-h-[min(72vh,680px)] flex-col bg-[var(--color-canvas)]",
        hiddenOnMobile ? "hidden md:flex" : "flex",
      )}
    >
      <div className="flex items-center gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-3.5 md:px-5">
        <button
          type="button"
          aria-label="Back to inbox"
          onClick={onBack}
          className="tap grid size-9 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-600)] hover:bg-[var(--color-canvas-deep)] md:hidden"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-[var(--color-ink-900)]">
            {title}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-ink-500)]">
            <span
              className={classNames(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                status.pillClass,
              )}
            >
              <span className={classNames("size-1.5 rounded-full", status.dotClass)} />
              {status.label}
            </span>
          </p>
        </div>
      </div>

      <div
        ref={messageListRef}
        className="flex-1 space-y-4 overflow-y-auto px-3 py-4 md:px-5 md:py-5"
      >
        {groupedMessages.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-4 text-sm leading-relaxed text-[var(--color-ink-600)] shadow-[var(--shadow-sm)]">
            {chatWelcomeMessage({
              audience: "customer",
              welcomeMessageCustomer,
            })}
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.day} className="space-y-3">
              <ChatMessageDayDivider label={group.day} />
              {group.messages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} variant="page" />
              ))}
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="border-t border-[var(--color-error-200)] bg-[var(--color-error-50)] px-4 py-2 text-[12px] text-[var(--color-error-700)] md:px-5">
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="border-t border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-3 md:px-5 md:py-4"
      >
        <ConversationComposer
          draft={draft}
          sending={sending}
          attachmentsEnabled={attachmentsEnabled}
          onDraftChange={onDraftChange}
          onAttach={onAttach}
        />
      </form>
    </section>
  );
}

interface ConversationComposerProps {
  draft: string;
  sending: boolean;
  attachmentsEnabled: boolean;
  onDraftChange: (value: string) => void;
  onAttach: (file: File, body?: string) => Promise<void>;
}

function ConversationComposer({
  draft,
  sending,
  attachmentsEnabled,
  onDraftChange,
  onAttach,
}: ConversationComposerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void onAttach(file, draft.trim() || undefined);
  }

  return (
    <div className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/70 p-2 shadow-[var(--shadow-sm)]">
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
            aria-label="Attach a file"
            disabled={sending}
            onClick={() => fileInputRef.current?.click()}
            className="tap grid size-10 shrink-0 place-items-center rounded-full text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Paperclip size={16} />
          </button>
        </>
      )}
      <textarea
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder={sending ? "Sending…" : "Write a message…"}
        aria-label="Message"
        rows={1}
        maxLength={CHAT_MESSAGE_BODY_MAX}
        disabled={sending}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[var(--color-ink-800)] placeholder:text-[var(--color-ink-400)] focus:outline-none disabled:opacity-60"
      />
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={sending || draft.trim().length === 0}
        isLoading={sending}
        leadingIcon={<Send size={14} />}
        className="shrink-0"
      >
        Send
      </Button>
    </div>
  );
}


function NewConversationPanel({
  draft,
  sending,
  error,
  onDraftChange,
  onSubmit,
  welcomeMessageCustomer,
}: {
  draft: string;
  sending: boolean;
  error: string | null;
  onDraftChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  welcomeMessageCustomer?: string;
}) {
  return (
    <div className="reveal-rise mt-6 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] md:mt-8">
      <section className="flex min-h-[min(60vh,520px)] flex-col bg-[var(--color-canvas)]">
        <div className="border-b border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-4 md:px-6">
          <p className="text-base font-semibold text-[var(--color-ink-900)]">Support</p>
          <p className="mt-0.5 text-[12px] text-[var(--color-ink-500)]">
            Write your message below and our team will respond promptly.
          </p>
        </div>

        <div className="flex-1 px-4 py-5 md:px-6 md:py-6">
          <div className="max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-4 text-sm leading-relaxed text-[var(--color-ink-600)] shadow-[var(--shadow-sm)]">
            {chatWelcomeMessage({
              audience: "customer",
              welcomeMessageCustomer,
            })}
          </div>
        </div>

        {error && (
          <div className="border-t border-[var(--color-error-200)] bg-[var(--color-error-50)] px-4 py-2 text-[12px] text-[var(--color-error-700)] md:px-6">
            {error}
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="border-t border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-3 md:px-6 md:py-4"
        >
          <div className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/70 p-2 shadow-[var(--shadow-sm)]">
            <textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Write your message…"
              aria-label="Message"
              rows={2}
              maxLength={CHAT_MESSAGE_BODY_MAX}
              disabled={sending}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              className="max-h-32 min-h-[52px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[var(--color-ink-800)] placeholder:text-[var(--color-ink-400)] focus:outline-none disabled:opacity-60"
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={sending || draft.trim().length === 0}
              isLoading={sending}
              leadingIcon={<Send size={14} />}
              className="shrink-0"
            >
              Send
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-[var(--radius-xl)] border border-[var(--color-error-200)] bg-[var(--color-error-50)] px-5 py-8 text-center md:mt-8">
      <p className="text-sm font-medium text-[var(--color-error-800)]">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() => window.location.reload()}
      >
        Try again
      </Button>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="mt-6 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] md:mt-8">
      <div className="grid min-h-[520px] md:grid-cols-[minmax(280px,340px)_1fr]">
        <div className="hidden border-r border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/50 p-4 md:block">
          <div className="skeleton h-4 w-24" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-[76px] rounded-[var(--radius-lg)]" />
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          <div className="border-b border-[var(--color-ink-100)] px-5 py-4">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton mt-2 h-3 w-28" />
          </div>
          <div className="flex-1 space-y-4 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className={classNames(
                  "skeleton h-14 rounded-[var(--radius-lg)]",
                  index % 2 === 0 ? "ml-auto w-[58%]" : "w-[62%]",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
