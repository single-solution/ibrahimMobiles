"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  createChatTransport,
  formatTimeAgo,
  type ChatThread,
  type ChatThreadSummary,
} from "@store/shared";
import { useChatSettings } from "@/lib/chat/chatSettingsContext";

import {
  fetchChatBootstrap,
  fetchChatThread,
  markChatThreadRead,
  pollChatThread,
  sendChatMessage,
} from "@/lib/chat/transport";

interface AccountMessagesViewProps {
  initialThreadId?: string;
}

export function AccountMessagesView({ initialThreadId }: AccountMessagesViewProps) {
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialThreadId ?? null);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollCursorRef = useRef<string | null>(null);
  const chatSettings = useChatSettings();

  const loadThreads = useCallback(async () => {
    const data = await fetchChatBootstrap();
    setThreads(data.threads);
    const hasInitialThread =
      initialThreadId && data.threads.some((thread) => thread.id === initialThreadId);
    if (data.threads.length > 0 && !activeId && !hasInitialThread) {
      setActiveId(data.threads[0].id);
    }
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
    if (!activeId) return;
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

  async function handleSend(body: string) {
    if (!activeId) return;
    const fresh = await sendChatMessage(activeId, body);
    setActiveThread(fresh);
    void loadThreads();
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-500)]">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-[var(--color-error-600)]">{error}</p>;
  }
  if (threads.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] px-4 py-6 text-sm text-[var(--color-ink-500)]">
        No messages yet. Use the chat button on any page to reach us.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <ul className="flex flex-col gap-1">
        {threads.map((thread) => (
          <li key={thread.id}>
            <button
              type="button"
              onClick={() => setActiveId(thread.id)}
              className={`w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-sm ${
                activeId === thread.id
                  ? "bg-[var(--color-accent-50)] font-semibold text-[var(--color-accent-800)]"
                  : "text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]"
              }`}
            >
              <span className="block truncate">{thread.lastMessagePreview}</span>
              <span className="text-[11px] text-[var(--color-ink-400)]">
                {formatTimeAgo(thread.lastMessageAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {activeThread ? (
        <div className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
          <div className="max-h-[420px] flex-1 overflow-y-auto px-4 py-3">
            {activeThread.messages.map((message) => (
              <div
                key={message.id}
                className={`mb-2 text-sm ${
                  message.author === "customer"
                    ? "text-right text-[var(--color-ink-800)]"
                    : "text-left text-[var(--color-ink-600)]"
                }`}
              >
                <p className="inline-block rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] px-3 py-2">
                  {message.body}
                </p>
              </div>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-[var(--color-ink-100)] p-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const input = form.elements.namedItem("body") as HTMLInputElement;
              const body = input.value.trim();
              if (!body) return;
              void handleSend(body).then(() => {
                input.value = "";
              });
            }}
          >
            <input
              name="body"
              type="text"
              placeholder="Type a message…"
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-[var(--radius-md)] bg-[var(--color-accent-700)] px-3 py-2 text-sm font-semibold text-white"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}
      <p className="md:col-span-2 text-xs text-[var(--color-ink-400)]">
        Prefer WhatsApp?{" "}
        <Link href="/" className="text-[var(--color-accent-700)] underline">
          Contact options on the home page
        </Link>
        .
      </p>
    </div>
  );
}
