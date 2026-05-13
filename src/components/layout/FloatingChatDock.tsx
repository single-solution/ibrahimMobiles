"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { AiChatWidget } from "@/components/layout/AiChatWidget";
import { buildWhatsAppLink } from "@/lib/constants";
import { classNames } from "@/lib/utils";

const WHATSAPP_DEFAULT_MESSAGE =
  "Salam! Aap se phone ke baare mein baat karni hai.";

const LABEL_AUTO_HIDE_MS = 4500;

interface FloatingChatDockProps {
  hideOnMobile?: boolean;
}

export function FloatingChatDock({ hideOnMobile = false }: FloatingChatDockProps) {
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowLabels(false);
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

      <div className="flex items-center gap-2.5">
        <AiToggleButton
          isOpen={isAiOpen}
          onToggle={handleAiToggle}
          showLabel={showLabels}
        />
        <WhatsAppButton showLabel={showLabels} />
      </div>
    </div>
  );
}

interface WhatsAppButtonProps {
  showLabel: boolean;
}

function WhatsAppButton({ showLabel }: WhatsAppButtonProps) {
  return (
    <a
      href={buildWhatsAppLink(WHATSAPP_DEFAULT_MESSAGE)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={classNames(
        "group flex items-center rounded-[var(--radius-full)] bg-[var(--color-whatsapp)] py-2.5 text-white shadow-[var(--shadow-md)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-whatsapp-dark)] hover:shadow-[var(--shadow-lg)]",
        showLabel ? "gap-2 pl-3 pr-4" : "gap-0 px-2.5",
      )}
    >
      <span className="grid size-7 place-items-center rounded-full bg-white/15 transition-transform group-hover:scale-110">
        <MessageCircle size={16} strokeWidth={2.4} className="fill-white text-white" />
      </span>
      <span
        className={classNames(
          "overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300",
          showLabel ? "max-w-[120px] opacity-100" : "max-w-0 opacity-0",
        )}
      >
        WhatsApp
      </span>
    </a>
  );
}

interface AiToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  showLabel: boolean;
}

function AiToggleButton({ isOpen, onToggle, showLabel }: AiToggleButtonProps) {
  const labelText = isOpen ? "Close" : "Chat with Bilal";
  const labelVisible = showLabel && !isOpen;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isOpen ? "Close AI assistant" : "Chat with Bilal — AI assistant"}
      aria-expanded={isOpen}
      className={classNames(
        "group relative flex items-center rounded-[var(--radius-full)] bg-[var(--color-accent-700)] py-2.5 text-white shadow-[var(--shadow-md)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-accent-800)] hover:shadow-[var(--shadow-lg)]",
        labelVisible ? "gap-2 pl-3 pr-4" : "gap-0 px-2.5",
      )}
    >
      <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-700)] transition-transform group-hover:scale-110">
        {isOpen ? <X size={14} /> : <Sparkles size={14} className="fill-white text-white" />}
      </span>
      <span
        className={classNames(
          "overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300",
          labelVisible ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0",
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
