"use client";

import { useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { AiChatWidget } from "@/components/layout/AiChatWidget";
import { classNames } from "@store/shared";

const LABEL_AUTO_HIDE_MS = 4500;

interface FloatingChatDockProps {
  hideOnMobile?: boolean;
}

export function FloatingChatDock({ hideOnMobile = false }: FloatingChatDockProps) {
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isLabelVisible, setIsLabelVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLabelVisible(false);
    }, LABEL_AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  function handleAiToggle() {
    setIsAiOpen((previous) => !previous);
  }

  function handleAiClose() {
    setIsAiOpen(false);
  }

  return (
    <div
      className={classNames(
        "floating-dock fixed right-4 z-40 flex-col items-end gap-2.5 md:right-7 md:flex",
        hideOnMobile ? "hidden" : "flex",
      )}
    >
      {isAiOpen && <AiChatWidget onCollapse={handleAiClose} />}

      <AiToggleButton
        isOpen={isAiOpen}
        onToggle={handleAiToggle}
        isLabelVisible={isLabelVisible}
      />
    </div>
  );
}

interface AiToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  isLabelVisible: boolean;
}

function AiToggleButton({ isOpen, onToggle, isLabelVisible }: AiToggleButtonProps) {
  const labelText = isOpen ? "Close" : "Ask us!";
  // Mobile-only peek: label stays visible during the initial mount window so
  // touch users see it once; after that, the mobile button collapses to icon.
  // Desktop always keeps the label pinned (md: utilities below).
  const labelPinnedOnMobile = isLabelVisible && !isOpen;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isOpen ? "Close chat" : "Ask us a question"}
      aria-expanded={isOpen}
      className={classNames(
        "tap group relative flex cursor-pointer items-center rounded-[var(--radius-full)] bg-[var(--color-accent-700)] py-2.5 text-white shadow-[var(--shadow-md)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-accent-800)] hover:shadow-[var(--shadow-lg)]",
        labelPinnedOnMobile ? "gap-2 pl-3 pr-4" : "gap-0 px-2.5",
        "md:gap-2 md:pl-3 md:pr-4",
      )}
    >
      <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-700)] transition-transform group-hover:scale-110">
        {isOpen ? <X size={14} /> : <MessageSquare size={14} className="fill-white text-white" />}
      </span>
      <span
        className={classNames(
          "overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300",
          labelPinnedOnMobile ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0",
          "md:max-w-[160px] md:opacity-100",
        )}
      >
        {labelText}
      </span>
      {!isOpen && (
        <span className="absolute -right-1 -top-1 flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent-400)] opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-[var(--color-accent-500)]" />
        </span>
      )}
    </button>
  );
}
