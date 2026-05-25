/**
 * Storefront chat transport client.
 *
 * Phase 8 is polling-only — the WebSocket broker (Phase 9, optional)
 * is dormant. The function signatures below intentionally mirror what
 * a future `liveModeEnabled` WebSocket transport would expose so the
 * widget code doesn't need to change when (if) it lands.
 */

import type {
  ChatMessage,
  ChatThread,
  ChatThreadSummary,
} from "@store/shared";

import type { ChatSettings } from "./chatSettings";

export interface ChatBootstrap {
  enabled: boolean;
  threads: ChatThreadSummary[];
  settings: ChatSettings;
}

export class ChatRequestError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function jsonOrThrow(res: Response): Promise<unknown> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: string; code?: string };
      if (body?.error) message = body.error;
      code = body?.code;
    } catch {
      // fall through
    }
    throw new ChatRequestError(message, code);
  }
  return res.json();
}

export async function fetchChatBootstrap(): Promise<ChatBootstrap> {
  const res = await fetch("/api/storefront/chat", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return (await jsonOrThrow(res)) as ChatBootstrap;
}

export async function fetchChatThread(id: string): Promise<ChatThread> {
  const res = await fetch(`/api/storefront/chat/${encodeURIComponent(id)}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return (await jsonOrThrow(res)) as ChatThread;
}

/** Poll tick — returns `null` when the server responds 304 (unchanged). */
export async function pollChatThread(
  id: string,
  since: string,
  etag?: string,
): Promise<ChatThread | null> {
  const params = new URLSearchParams({ since });
  const res = await fetch(
    `/api/storefront/chat/${encodeURIComponent(id)}?${params}`,
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: etag ? { "If-None-Match": etag } : undefined,
    },
  );
  if (res.status === 304) return null;
  return (await jsonOrThrow(res)) as ChatThread;
}

export async function fetchChatUnreadSummary(): Promise<number> {
  const res = await fetch("/api/storefront/chat?summary=1", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = (await jsonOrThrow(res)) as { unreadByCustomer: number };
  return data.unreadByCustomer;
}

export async function markChatThreadRead(threadId: string): Promise<void> {
  const res = await fetch(
    `/api/storefront/chat/${encodeURIComponent(threadId)}/read`,
    { method: "POST", credentials: "same-origin" },
  );
  if (res.status === 204 || res.status === 304) return;
  if (!res.ok) {
    await jsonOrThrow(res);
  }
}

export interface StartChatInput {
  customerName: string;
  phoneNumber: string;
  body: string;
  subjectProductId?: string;
  subjectProductName?: string;
}

export interface StartAnonymousChatInput {
  subjectProductId?: string;
  subjectProductName?: string;
}

export async function startAnonymousChatThread(
  input: StartAnonymousChatInput = {},
): Promise<ChatThread> {
  const res = await fetch("/api/storefront/chat/start-anonymous", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)) as ChatThread;
}

export async function startCustomerChatThread(): Promise<ChatThread> {
  const res = await fetch("/api/storefront/chat/start-customer", {
    method: "POST",
    credentials: "same-origin",
  });
  return (await jsonOrThrow(res)) as ChatThread;
}

export async function startChatThread(
  input: StartChatInput,
): Promise<ChatThread> {
  const res = await fetch("/api/storefront/chat/start", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)) as ChatThread;
}

export async function sendChatMessage(
  threadId: string,
  body: string,
): Promise<ChatThread> {
  const res = await fetch(
    `/api/storefront/chat/${encodeURIComponent(threadId)}/messages`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    },
  );
  return (await jsonOrThrow(res)) as ChatThread;
}

export async function uploadChatAttachment(
  threadId: string,
  file: File,
  body?: string,
): Promise<ChatThread> {
  const formData = new FormData();
  formData.append("file", file);
  if (body) formData.append("body", body);
  const res = await fetch(
    `/api/storefront/chat/${encodeURIComponent(threadId)}/attachments`,
    {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    },
  );
  return (await jsonOrThrow(res)) as ChatThread;
}

/**
 * Optimistic message stub — used by the composer to render the message
 * locally before the server round-trip. Replaced by the real id when the
 * POST resolves.
 */
export function makeOptimisticMessage(args: {
  body: string;
  authorName?: string;
}): ChatMessage {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    author: "customer",
    authorName: args.authorName,
    body: args.body,
    createdAt: new Date().toISOString(),
  };
}
