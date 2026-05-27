"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminApi";

export function InquiriesUnreadBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await adminFetch<{ unreadByTeam: number }>(
          "/api/inquiries?summary=1",
        );
        if (!cancelled) setCount(data.unreadByTeam);
      } catch {
        // ignore
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <span
      className="absolute right-1 top-1 size-2 rounded-full bg-rose-500"
      aria-label={`${count} unread inquiries`}
    />
  );
}
