"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { classNames } from "@store/shared";

import { useChatSettings } from "@/lib/chat/chatSettingsContext";
import { fetchChatUnreadSummary } from "@/lib/chat/transport";
import { OPEN_CHAT_EVENT, type OpenChatDetail } from "@/lib/chat/openChat";

const LiveChatWidget = dynamic(
  () =>
    import("@/app/_components/chat/LiveChatWidget").then((m) => m.LiveChatWidget),
  { ssr: false, loading: () => null },
);

const LABEL_AUTO_HIDE_MS = 4500;
const HIDDEN_PREFIXES = ["/checkout", "/account/sign-in"];

export function ChatFabShell() {
  const chatSettings = useChatSettings();
  const pathname = usePathname() ?? "";
  const [isOpen, setIsOpen] = useState(false);
  const [isLabelVisible, setIsLabelVisible] = useState(true);
  const [unread, setUnread] = useState(0);
  const [openDetail, setOpenDetail] = useState<OpenChatDetail | null>(null);

  const hidden =
    !chatSettings.enabled ||
    HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

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
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, []);

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

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
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
