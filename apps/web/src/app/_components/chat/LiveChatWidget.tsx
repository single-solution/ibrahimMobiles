"use client";

/**
 * Real-time chat widget for the storefront.
 *
 * Each visitor (guest or signed-in) has exactly ONE persistent conversation,
 * so there is no thread list — the widget opens straight into it.
 *
 * Modes:
 *   - "loading"  — bootstrap fetch in flight.
 *   - "disabled" — admin toggled chat.enabled = false; render nothing.
 *   - "starting" — the conversation is being created.
 *   - "compose"  — no conversation yet; first-message composer.
 *   - "thread"   — the conversation; messages + composer.
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
import { usePathname, useSearchParams } from "next/navigation";

import {
  buildWhatsAppLink,
  createChatTransport,
  customerChatSupportLabel,
  guestChatLoginRequired,
  isAnonymousChatPhone,
  countCustomerChatMessages,
  type ChatThread,
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
import { useStoreSettings } from "@/lib/core/storeSettingsContext";

import {
  ChatShell,
  ComposeConversation,
  SupportHintFooter,
  ThreadConversation,
  statusLabel,
} from "./liveChatWidgetViews";

type WidgetView = "thread" | "starting" | "compose";

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
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [view, setView] = useState<WidgetView>("compose");
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
      // One conversation per visitor: open it, or compose the first message.
      if (data.threads.length === 0) {
        setView("compose");
      } else {
        setActiveThreadId(data.threads[0].id);
        setView("thread");
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

  const loginRequired = activeThread && settings
    ? guestChatLoginRequired({
        customerId: activeThread.customerId,
        phoneNumber: activeThread.phoneNumber,
        guestMessageLimit: settings.guestMessageLimit,
        messages: activeThread.messages,
      })
    : false;

  const previewMessagesLeft =
    activeThread && isAnonymousChatPhone(activeThread.phoneNumber) && settings
      ? Math.max(
          0,
          settings.guestMessageLimit -
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
          guestMessageLimit={settings?.guestMessageLimit ?? 5}
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
          guestMessageLimit={settings?.guestMessageLimit ?? 5}
          welcomeMessageGuest={settings?.welcomeMessageGuest}
          welcomeMessageCustomer={settings?.welcomeMessageCustomer}
        />
      )}
      <SupportHintFooter assistantEnabled={settings?.assistantEnabled ?? false} />
    </ChatShell>
  );
}
