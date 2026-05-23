export const OPEN_CHAT_EVENT = "store:open-chat";

export interface OpenChatDetail {
  initialBody?: string;
  subjectProductId?: string;
  subjectProductName?: string;
}

export function openChatWidget(detail: OpenChatDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail }));
}
