"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { classNames } from "@store/shared";

import { useChatSettings } from "@/lib/chat/chatSettingsContext";
import { fetchChatUnreadSummary } from "@/lib/chat/transport";
import { OPEN_CHAT_EVENT, type OpenChatDetail } from "@/lib/chat/openChat";
import {
  buildChatNudgeLine,
  chatPageContextKey,
  getChatPageContext,
  subscribeChatPageContext,
  type ChatPageContext,
} from "@/lib/chat/pageChatContext";

const LiveChatWidget = dynamic(
  () =>
    import("@/app/_components/chat/LiveChatWidget").then((m) => m.LiveChatWidget),
  { ssr: false, loading: () => null },
);

const LABEL_AUTO_HIDE_MS = 4500;
const HIDDEN_PREFIXES = ["/checkout", "/account/sign-in"];

const NUDGE_OFF_KEY = "chat.nudge.off";
const NUDGE_SHOWN_KEY = "chat.nudge.shown";

/** Visitor dismissed the nudge or engaged the chat — silence it for the session. */
function isNudgeOff(): boolean {
  try {
    return sessionStorage.getItem(NUDGE_OFF_KEY) === "1";
  } catch {
    return false;
  }
}

function markNudgeOff(): void {
  try {
    sessionStorage.setItem(NUDGE_OFF_KEY, "1");
  } catch {
    // sessionStorage may be unavailable (private mode) — nudge just won't persist.
  }
}

function nudgeShownContexts(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(NUDGE_SHOWN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function markNudgeShown(key: string): void {
  try {
    const shown = nudgeShownContexts();
    shown.add(key);
    sessionStorage.setItem(NUDGE_SHOWN_KEY, JSON.stringify([...shown]));
  } catch {
    // best-effort
  }
}

/** Seed the opener with the current product when one is in view. */
function deriveOpenerDetail(context: ChatPageContext): OpenChatDetail | null {
  if (context.kind === "product" && context.productId && context.productName) {
    return {
      subjectProductId: context.productId,
      subjectProductName: context.productName,
    };
  }
  return null;
}

export function ChatFabShell() {
  const chatSettings = useChatSettings();
  const pathname = usePathname() ?? "";
  const [isOpen, setIsOpen] = useState(false);
  const [isLabelVisible, setIsLabelVisible] = useState(true);
  const [unread, setUnread] = useState(0);
  const [openDetail, setOpenDetail] = useState<OpenChatDetail | null>(null);
  const [pageContext, setPageContext] = useState<ChatPageContext>(getChatPageContext());
  const [nudge, setNudge] = useState<string | null>(null);

  const hidden =
    !chatSettings.enabled ||
    HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const openChat = useCallback(
    (detail?: OpenChatDetail | null) => {
      setOpenDetail(detail ?? deriveOpenerDetail(pageContext));
      setIsOpen(true);
      setNudge(null);
      markNudgeOff();
    },
    [pageContext],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLabelVisible(false), LABEL_AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!chatSettings.enabled) return;
    try {
      const count = await fetchChatUnreadSummary();
      setUnread(count);
    } catch {
      // badge is best-effort
    }
  }, [chatSettings.enabled]);

  useEffect(() => {
    if (hidden) return;

    let pollTimer: number | undefined;
    let cancelled = false;

    const scheduleNextPoll = () => {
      if (cancelled) return;
      pollTimer = window.setTimeout(async () => {
        if (document.visibilityState === "visible") {
          await refreshUnread();
        }
        scheduleNextPoll();
      }, 60_000);
    };

    const kickoff = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      void refreshUnread().finally(scheduleNextPoll);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        kickoff();
      } else if (pollTimer != null) {
        window.clearTimeout(pollTimer);
        pollTimer = undefined;
      }
    };

    const idleHandle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(kickoff, { timeout: 4000 })
        : window.setTimeout(kickoff, 2500);

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (typeof idleHandle === "number") {
        window.clearTimeout(idleHandle);
      } else {
        window.cancelIdleCallback(idleHandle);
      }
      if (pollTimer != null) {
        window.clearTimeout(pollTimer);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [hidden, refreshUnread]);

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<OpenChatDetail>).detail;
      setOpenDetail(detail ?? null);
      setIsOpen(true);
      setNudge(null);
      markNudgeOff();
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, []);

  // Track what the visitor is looking at (product / category / deals / …).
  useEffect(() => subscribeChatPageContext(setPageContext), []);

  // Proactive idle nudge: after N idle minutes, show a context-aware teaser
  // beside the closed launcher. Once per session, plus once per new product /
  // category context. Suppressed if open, already chatted (unread), or dismissed.
  useEffect(() => {
    if (
      hidden ||
      !chatSettings.proactiveNudgeEnabled ||
      isOpen ||
      unread > 0 ||
      nudge !== null
    ) {
      return;
    }
    if (typeof window === "undefined" || isNudgeOff()) {
      return;
    }
    const key = chatPageContextKey(pageContext);
    if (nudgeShownContexts().has(key)) {
      return;
    }
    const delayMs = Math.max(1, chatSettings.proactiveNudgeMinutes) * 60_000;
    const timer = window.setTimeout(() => {
      if (isNudgeOff()) {
        return;
      }
      setNudge(buildChatNudgeLine(pageContext));
      markNudgeShown(key);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [
    hidden,
    chatSettings.proactiveNudgeEnabled,
    chatSettings.proactiveNudgeMinutes,
    isOpen,
    unread,
    nudge,
    pageContext,
  ]);

  if (hidden) return null;

  return (
    <div className="floating-dock fixed right-4 z-40 flex flex-col items-end gap-2.5 md:right-7">
      {isOpen && (
        <LiveChatWidget
          onCollapse={() => {
            setIsOpen(false);
            setOpenDetail(null);
            void refreshUnread();
          }}
          initialOpenDetail={openDetail}
        />
      )}

      {Boolean(nudge) && !isOpen && unread === 0 && (
        <div className="reveal-rise flex max-w-[260px] items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] py-2.5 pl-3 pr-2 shadow-[var(--shadow-md)]">
          <button
            type="button"
            onClick={() => openChat()}
            className="tap text-left text-[12.5px] leading-snug text-[var(--color-ink-700)] hover:text-[var(--color-ink-900)]"
          >
            {nudge}
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => {
              setNudge(null);
              markNudgeOff();
            }}
            className="tap -mr-0.5 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[var(--color-ink-400)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-700)]"
          >
            <X size={12} strokeWidth={2.4} />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openChat())}
        aria-label={isOpen ? "Close chat" : "Ask us a question"}
        aria-expanded={isOpen}
        className={classNames(
          "tap group relative flex cursor-pointer items-center rounded-[var(--radius-full)] bg-[var(--color-ink-900)] py-2.5 text-[var(--color-on-dark)] shadow-[var(--shadow-md)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-ink-800)] hover:shadow-[var(--shadow-lg)]",
          isLabelVisible && !isOpen ? "gap-2 pl-3 pr-4" : "gap-0 px-2.5",
          "md:gap-2 md:pl-3 md:pr-4",
        )}
      >
        <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-500)] text-[var(--color-ink-900)] transition-transform group-hover:scale-110">
          {isOpen ? (
            <X size={14} strokeWidth={2.4} />
          ) : (
            <MessageSquare size={14} strokeWidth={2.4} />
          )}
        </span>
        <span
          className={classNames(
            "overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300",
            isLabelVisible && !isOpen ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0",
            "md:max-w-[160px] md:opacity-100",
          )}
        >
          {isOpen ? "Close" : "Ask us!"}
        </span>
        {!isOpen && unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-[var(--color-danger-500)] px-1 text-[10px] font-bold text-[var(--color-on-dark)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
