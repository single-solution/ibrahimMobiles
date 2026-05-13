"use client";

import { useState } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { AiChatWidget } from "@/components/layout/AiChatWidget";
import { buildWhatsAppLink } from "@/lib/constants";

const WHATSAPP_DEFAULT_MESSAGE =
  "Salam! Aap se phone ke baare mein baat karni hai.";

export function FloatingChatDock() {
  const [isAiOpen, setIsAiOpen] = useState(false);

  function handleAiToggle() {
    setIsAiOpen((previous) => !previous);
  }

  function handleAiClose() {
    setIsAiOpen(false);
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      {isAiOpen && <AiChatWidget onCollapse={handleAiClose} />}

      <div className="flex flex-col items-end gap-3">
        <WhatsAppButton />
        <AiToggleButton isOpen={isAiOpen} onToggle={handleAiToggle} />
      </div>
    </div>
  );
}

function WhatsAppButton() {
  return (
    <a
      href={buildWhatsAppLink(WHATSAPP_DEFAULT_MESSAGE)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group flex items-center gap-2 rounded-[var(--radius-full)] bg-[var(--color-whatsapp)] py-2.5 pl-3 pr-4 text-white shadow-[var(--shadow-md)] transition-all hover:-translate-y-0.5 hover:bg-[var(--color-whatsapp-dark)] hover:shadow-[var(--shadow-lg)]"
    >
      <span className="grid size-7 place-items-center rounded-full bg-white/15 transition-transform group-hover:scale-110">
        <MessageCircle size={16} strokeWidth={2.4} className="fill-white text-white" />
      </span>
      <span className="hidden text-sm font-medium sm:inline">WhatsApp</span>
    </a>
  );
}

interface AiToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

function AiToggleButton({ isOpen, onToggle }: AiToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isOpen ? "Close AI assistant" : "Chat with Bilal — AI assistant"}
      aria-expanded={isOpen}
      className="group relative flex items-center gap-2 rounded-[var(--radius-full)] bg-[var(--color-accent-700)] py-2.5 pl-3 pr-4 text-white shadow-[var(--shadow-md)] transition-all hover:-translate-y-0.5 hover:bg-[var(--color-accent-800)] hover:shadow-[var(--shadow-lg)]"
    >
      <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-700)] transition-transform group-hover:scale-110">
        {isOpen ? <X size={14} /> : <Sparkles size={14} className="fill-white text-white" />}
      </span>
      <span className="hidden text-sm font-medium sm:inline">
        {isOpen ? "Close" : "Chat with Bilal"}
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
