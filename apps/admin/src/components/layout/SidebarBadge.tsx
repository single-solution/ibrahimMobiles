"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { classNames } from "@store/shared";

interface SidebarSummary {
  ordersUnread: number;
  customersUnread: number;
  inquiriesUnread: number;
}

const POLL_INTERVAL_MS = 30_000;

export function SidebarBadge({ 
  type,
  isCollapsed
}: { 
  type: "orders" | "customers" | "inquiries";
  isCollapsed: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await apiFetch<SidebarSummary>("/api/sidebar/summary");
        if (!cancelled) {
          if (type === "orders") setCount(data.ordersUnread);
          else if (type === "customers") setCount(data.customersUnread);
          else if (type === "inquiries") setCount(data.inquiriesUnread);
        }
      } catch {
        // ignore
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [type]);

  if (count <= 0) return null;

  if (isCollapsed) {
    return (
      <span
        className="absolute right-1 top-1 size-2 rounded-full bg-rose-500"
        aria-label={`${count} unread`}
      />
    );
  }

  return (
    <span
      className="ml-auto inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
