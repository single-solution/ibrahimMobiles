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
    import("@/components/chat/LiveChatWidget").then((m) => m.LiveChatWidget),
  { ssr: false, loading: () => null },
);

const LABEL_AUTO_HIDE_MS = 4500;
const HIDDEN_PREFIXES = ["/checkout", "/account/sign-in"];

interface ChatFabShellProps {
  /**
   * Stack the FAB above a mobile sticky CTA bar (e.g. the PDP add-to-cart bar).
   * Adds extra bottom offset so the two don't overlap on phones; desktop
   * positioning is unaffected.
   */
  mobileStackedAbove?: "pdp-cta" | null;
}

export function ChatFabShell({ mobileStackedAbove = null }: ChatFabShellProps) {
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
    const kickoff = window.setTimeout(() => void refreshUnread(), 0);
    const timer = window.setInterval(() => void refreshUnread(), 60_000);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
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
    <div
      className={classNames(
        "floating-dock fixed right-4 z-40 flex flex-col items-end gap-2.5 md:right-7",
        mobileStackedAbove === "pdp-cta" && "floating-dock--above-pdp-cta",
      )}
    >
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
          "tap group relative flex cursor-pointer items-center rounded-[var(--radius-full)] bg-[var(--color-ink-900)] py-2.5 text-white shadow-[var(--shadow-md)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-ink-800)] hover:shadow-[var(--shadow-lg)]",
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
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
