"use client";

/**
 * Real-time chat widget for the storefront.
 *
 * Modes:
 *   - "loading"  — bootstrap fetch in flight.
 *   - "disabled" — admin toggled chat.enabled = false; render nothing.
 *   - "starting" — anonymous thread being created.
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
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquare, Paperclip, Plus, Send, X } from "lucide-react";

import {
  CHAT_GUEST_MESSAGE_LIMIT,
  CHAT_MESSAGE_BODY_MAX,
  buildWhatsAppLink,
  classNames,
  createChatTransport,
  customerChatSupportLabel,
  formatTimeAgo,
  guestChatLoginRequired,
  isAnonymousChatPhone,
  countCustomerChatMessages,
  type ChatMessage,
  type ChatThread,
  type ChatThreadSummary,
} from "@store/shared";

import {
  ChatMessageBubble,
  ChatMessageDayDivider,
  chatWelcomeMessage,
  groupChatMessagesByDay,
} from "@/app/_components/chat/chatMessageUi";
import type { ChatSettings } from "@/lib/chat/chatSettings";
import type { OpenChatDetail } from "@/lib/chat/openChat";
import {
  fetchChatBootstrap,
  fetchChatThread,
  markChatThreadRead,
  pollChatThread,
  makeOptimisticMessage,
  sendChatMessage,
  startAnonymousChatThread,
  startCustomerChatThread,
  ChatRequestError,
  uploadChatAttachment,
} from "@/lib/chat/transport";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

import {
  ChatShell,
  ComposeConversation,
  SupportHintFooter,
  ThreadConversation,
  ThreadList,
  statusLabel,
} from "./liveChatWidgetViews";

type WidgetView = "list" | "thread" | "starting" | "compose";

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
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const signInHref = useMemo(() => {
    const next = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    return `/account/sign-in?next=${encodeURIComponent(next)}`;
  }, [pathname, searchParams]);
  const [composerDraft, setComposerDraft] = useState("");
  const [isSignedInCustomer, setIsSignedInCustomer] = useState(false);
  const [composeSubjectName, setComposeSubjectName] = useState<string | undefined>(
    initialOpenDetail?.subjectProductName,
  );
  const composeProductIdRef = useRef<string | undefined>(initialOpenDetail?.subjectProductId);
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
      setIsSignedInCustomer(data.isSignedInCustomer);
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
        setComposerDraft(initialOpenDetail.initialBody);
      }
      setComposeSubjectName(initialOpenDetail?.subjectProductName);
      composeProductIdRef.current = initialOpenDetail?.subjectProductId;
      if (data.threads.length === 0) {
        setView("compose");
      } else if (data.threads.length === 1) {
        setActiveThreadId(data.threads[0].id);
        setView("thread");
      } else {
        setView("list");
      }
    })();
  }, [refreshBootstrap, initialOpenDetail]);

  // After sign-in redirect, refresh thread so guest gate clears.
  useEffect(() => {
    function onFocus() {
      void refreshBootstrap();
      const threadId = activeThreadIdRef.current;
      if (!threadId) return;
      void fetchChatThread(threadId).then((thread) => {
        setActiveThread(thread);
      });
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshBootstrap]);

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
            const newReply = fresh.messages
              .slice(prevLen)
              .some((m) => m.author === "agent" || m.author === "assistant");
            if (newReply && document.hidden) {
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
    if (threads.length > 0) {
      setView("list");
      return;
    }
    setView("compose");
  }

  async function handleComposeSend(body: string) {
    setBootstrapError(null);
    setView("starting");
    try {
      const thread = isSignedInCustomer
        ? await startCustomerChatThread()
        : await startAnonymousChatThread({
            subjectProductId: composeProductIdRef.current,
            subjectProductName: composeSubjectName,
          });
      const fresh = await sendChatMessage(thread.id, body);
      lastActivityAtRef.current = Date.now();
      setActiveThread(fresh);
      setActiveThreadId(fresh.id);
      setView("thread");
      void refreshBootstrap();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Could not start chat.";
      setBootstrapError(msg);
      setView("compose");
      throw error;
    }
  }

  async function handleAttach(file: File, body?: string) {
    if (!activeThread) return;
    try {
      const fresh = await uploadChatAttachment(activeThread.id, file, body);
      lastActivityAtRef.current = Date.now();
      setActiveThread(fresh);
      void refreshBootstrap();
    } catch (error) {
      if (error instanceof ChatRequestError && error.code === "login_required") {
        setBootstrapError(error.message);
      }
      throw error;
    }
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
      if (error instanceof ChatRequestError && error.code === "login_required") {
        setBootstrapError(error.message);
      }
      throw error;
    }
  }

  const loginRequired = activeThread
    ? guestChatLoginRequired({
        customerId: activeThread.customerId,
        phoneNumber: activeThread.phoneNumber,
        messages: activeThread.messages,
      })
    : false;

  const previewMessagesLeft =
    activeThread && isAnonymousChatPhone(activeThread.phoneNumber)
      ? Math.max(
          0,
          CHAT_GUEST_MESSAGE_LIMIT -
            countCustomerChatMessages(activeThread.messages),
        )
      : null;

  const supportLabel = customerChatSupportLabel(settings?.assistantName);

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
          <p className="max-w-prose">
            Chat is currently disabled. Please reach us on WhatsApp.
          </p>
          <a
            href={buildWhatsAppLink("Salam!", whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[var(--radius-md)] bg-[var(--color-accent-500)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-900)] hover:bg-[var(--color-accent-600)]"
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
      title={
        settings?.assistantEnabled ? supportLabel : siteName
      }
      subtitle={
        view === "thread" && activeThread
          ? statusLabel(activeThread.status)
          : settings?.assistantEnabled
            ? "Support chat · replies in seconds"
            : "We typically reply within an hour"
      }
      onBack={view === "thread" && threads.length > 0 ? handleBackToList : undefined}
    >
      {bootstrapError && (
        <div className="border-b border-[var(--color-error-200)] bg-[var(--color-error-50)] px-4 py-2 text-xs text-[var(--color-error-700)]">
          {bootstrapError}
        </div>
      )}
      {view === "starting" && (
        <div className="flex flex-1 items-center justify-center bg-[var(--color-canvas-deep)] px-4 text-sm text-[var(--color-ink-500)]">
          Starting chat…
        </div>
      )}
      {view === "list" && (
        <ThreadList
          threads={threads}
          onOpen={handleOpenThread}
          onNew={() => {
            setComposeSubjectName(undefined);
            composeProductIdRef.current = undefined;
            setComposerDraft("");
            setBootstrapError(null);
            setView("compose");
          }}
        />
      )}
      {view === "compose" && (
        <ComposeConversation
          draft={composerDraft}
          onDraftChange={setComposerDraft}
          onSend={handleComposeSend}
          welcomeMessage={
            isSignedInCustomer
              ? settings?.welcomeMessageCustomer
              : settings?.welcomeMessageGuest
          }
          subjectProductName={composeSubjectName}
          signInHref={signInHref}
          isSignedInCustomer={isSignedInCustomer}
        />
      )}
      {view === "thread" && activeThread && (
        <ThreadConversation
          thread={activeThread}
          onSend={handleSend}
          onAttach={handleAttach}
          attachmentsEnabled={Boolean(settings?.attachmentsEnabled)}
          initialDraft={composerDraft}
          onDraftConsumed={() => setComposerDraft("")}
          loginRequired={loginRequired}
          signInHref={signInHref}
          previewMessagesLeft={previewMessagesLeft}
          welcomeMessageGuest={settings?.welcomeMessageGuest}
          welcomeMessageCustomer={settings?.welcomeMessageCustomer}
        />
      )}
      <SupportHintFooter assistantEnabled={settings?.assistantEnabled ?? false} />
    </ChatShell>
  );
}
