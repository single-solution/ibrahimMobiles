"use client";

import { useMemo, useState } from "react";
import { Mic, Send, Sparkles, X } from "lucide-react";
import { buildWhatsAppLink, classNames } from "@store/shared";

import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

type ChatRole = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  body: string;
  language?: "ur-Latn" | "en";
}

const ASSISTANT_NAME = "Bilal";
const ASSISTANT_TAGLINE = "AI assistant · Urdu, Roman Urdu, English";

function buildSampleConversation(siteName: string): ChatMessage[] {
  return [
  {
    id: "msg-1",
    role: "assistant",
    body: `Salam! Main Bilal hun, ${siteName} ka assistant. Aap koi bhi sawal Urdu, Roman Urdu ya English mein pooch sakte hain.`,
    language: "ur-Latn",
  },
  {
    id: "msg-2",
    role: "user",
    body: "iPhone 14 chahiye, kya price hai?",
    language: "ur-Latn",
  },
  {
    id: "msg-3",
    role: "assistant",
    body: "iPhone 14 ke 3 variants stock mein hain:\n• Genuine A+ (PTA, 128 GB Blue) — Rs 175,000\n• China Water Pack A (Non-PTA, 128 GB) — Rs 142,000\n• Refurbished A (PTA, 128 GB Midnight) — Rs 138,000\n\nBattery range har variant ka different hai (85–95%). Aap konsa pasand karenge?",
    language: "ur-Latn",
  },
  {
    id: "msg-4",
    role: "user",
    body: "Genuine wala lena hai, lekin price thori zyada hai",
    language: "ur-Latn",
  },
  {
    id: "msg-5",
    role: "assistant",
    body: "Samajh gaya. Full bank transfer par 5% off mil jata hai — Genuine wala phir Rs 166,250 ka ho jata hai. 15 din ka moneyback bhi mil raha hai, aur dispatch se pehle aapke unit ki ek video bhejunga (IMEI + body + screen). Approve karein, phir dispatch. Lahore mein aaj hi mil jaye ga.",
    language: "ur-Latn",
  },
  ];
}

const QUICK_REPLIES = [
  "Variants compare karein",
  "Bank details bhejein",
  "Battery range kitni?",
  "Moneyback policy?",
  "Video kab milegi?",
];

const ESCALATE_MESSAGE =
  "Salam! AI assistant se baat ki, ab live agent se baat karni hai.";

interface AiChatWidgetProps {
  onCollapse?: () => void;
}

export function AiChatWidget({ onCollapse }: AiChatWidgetProps) {
  const [draftMessage, setDraftMessage] = useState("");
  const { siteName, whatsappNumber } = useStoreSettings();
  const messages = useMemo(() => buildSampleConversation(siteName), [siteName]);

  function handleDraftChange(event: React.ChangeEvent<HTMLInputElement>) {
    setDraftMessage(event.target.value);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setDraftMessage("");
  }

  return (
    <div
      role="dialog"
      aria-label={`Chat with ${ASSISTANT_NAME}`}
      className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden bg-[var(--color-surface)] md:static md:h-[560px] md:w-[min(380px,calc(100vw-2rem))] md:rounded-[var(--radius-xl)] md:border md:border-[var(--color-ink-100)] md:shadow-[var(--shadow-lg)]"
    >
      <ChatHeader onClose={onCollapse} />
      <MessageList messages={messages} />
      <QuickReplies replies={QUICK_REPLIES} />
      <ChatComposer
        draftMessage={draftMessage}
        onDraftChange={handleDraftChange}
        onSubmit={handleSubmit}
      />
      <EscalationFooter whatsappNumber={whatsappNumber} />
    </div>
  );
}

interface ChatHeaderProps {
  onClose?: () => void;
}

function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-ink-900)] px-4 py-3 text-white">
      <div className="relative">
        <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-700)] font-semibold text-lg font-medium">
          B
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--color-ink-900)] bg-[var(--color-accent-400)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
          {ASSISTANT_NAME}
          <Sparkles size={11} className="text-[var(--color-accent-300)]" />
        </p>
        <p className="text-[11px] leading-tight text-[var(--color-ink-300)]">
          {ASSISTANT_TAGLINE}
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
  );
}

interface MessageListProps {
  messages: ChatMessage[];
}

function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--color-canvas-deep)] px-4 py-4">
      <div className="flex justify-center">
        <span className="rounded-[var(--radius-full)] bg-[var(--color-surface)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
          Today · Sample chat
        </span>
      </div>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <TypingIndicator />
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  return (
    <div
      className={classNames(
        "flex gap-2",
        isAssistant ? "justify-start" : "justify-end",
      )}
    >
      {isAssistant && (
        <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-700)] text-[11px] font-semibold text-white">
          B
        </span>
      )}
      <div
        className={classNames(
          "max-w-[78%] whitespace-pre-line rounded-[var(--radius-lg)] px-3.5 py-2.5 text-sm leading-relaxed shadow-[var(--shadow-sm)]",
          isAssistant
            ? "rounded-tl-sm bg-[var(--color-surface)] text-[var(--color-ink-800)]"
            : "rounded-tr-sm bg-[var(--color-ink-900)] text-[var(--color-canvas)]",
        )}
      >
        {message.body}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-700)] text-[11px] font-semibold text-white">
        B
      </span>
      <div className="flex items-center gap-1 rounded-[var(--radius-lg)] rounded-tl-sm bg-[var(--color-surface)] px-3 py-2.5 shadow-[var(--shadow-sm)]">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}

interface DotProps {
  delay: string;
}

function Dot({ delay }: DotProps) {
  return (
    <span
      className="size-1.5 animate-pulse rounded-full bg-[var(--color-ink-400)]"
      style={{ animationDelay: delay }}
    />
  );
}

interface QuickRepliesProps {
  replies: string[];
}

function QuickReplies({ replies }: QuickRepliesProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {replies.map((reply) => (
        <button
          key={reply}
          type="button"
          className="shrink-0 rounded-[var(--radius-full)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)] transition-colors hover:border-[var(--color-accent-500)] hover:bg-[var(--color-accent-50)] hover:text-[var(--color-accent-800)]"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}

interface ChatComposerProps {
  draftMessage: string;
  onDraftChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent) => void;
}

function ChatComposer({ draftMessage, onDraftChange, onSubmit }: ChatComposerProps) {
  const isEmpty = draftMessage.trim().length === 0;

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-2 border-t border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2.5"
    >
      <input
        type="text"
        name="message"
        value={draftMessage}
        onChange={onDraftChange}
        placeholder="Apni baat likhein…"
        aria-label="Type a message"
        className="h-9 flex-1 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] px-3 text-sm text-[var(--color-ink-800)] placeholder:text-[var(--color-ink-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)]"
      />
      <button
        type="button"
        aria-label="Voice message"
        className="grid size-9 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-800)]"
      >
        <Mic size={16} />
      </button>
      <button
        type="submit"
        aria-label="Send message"
        disabled={isEmpty}
        className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-ink-900)] text-white transition-opacity disabled:opacity-40"
      >
        <Send size={14} />
      </button>
    </form>
  );
}

interface EscalationFooterProps {
  whatsappNumber: string;
}

function EscalationFooter({ whatsappNumber }: EscalationFooterProps) {
  return (
    <a
      href={buildWhatsAppLink(ESCALATE_MESSAGE, whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      className="border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-4 py-2.5 text-center text-xs text-[var(--color-ink-600)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink-900)]"
    >
      Or chat with a real person on{" "}
      <span className="font-semibold text-[var(--color-whatsapp-dark)]">WhatsApp</span> →
    </a>
  );
}
