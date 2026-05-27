"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

interface AdminSessionProviderProps {
  children: ReactNode;
}

export function AdminSessionProvider({ children }: AdminSessionProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
