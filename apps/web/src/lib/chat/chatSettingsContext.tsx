"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { ChatSettings } from "@/lib/chat/chatSettings";

const DEFAULTS: ChatSettings = {
  enabled: true,
  liveModeEnabled: false,
  websocketUrl: "",
  pollIntervalMsFocused: 5_000,
  pollIntervalMsBlurred: 30_000,
  guestThreadTokenDays: 90,
  attachmentsEnabled: false,
};

const ChatSettingsContext = createContext<ChatSettings>(DEFAULTS);

export function ChatSettingsProvider({
  value,
  children,
}: {
  value: ChatSettings;
  children: ReactNode;
}) {
  return (
    <ChatSettingsContext.Provider value={value}>
      {children}
    </ChatSettingsContext.Provider>
  );
}

export function useChatSettings(): ChatSettings {
  return useContext(ChatSettingsContext);
}
