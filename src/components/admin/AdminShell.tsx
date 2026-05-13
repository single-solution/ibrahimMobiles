"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";
import { ADMIN_SESSION_KEY } from "@/components/admin/adminSession";

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const isSignedIn = window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";
    if (!isSignedIn) {
      router.replace("/admin/login");
      return;
    }
    setIsHydrated(true);
  }, [router, pathname]);

  if (!isHydrated) {
    return (
      <div className="grid h-screen place-items-center bg-[var(--color-canvas)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-500)]">
          Loading admin…
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-canvas-deep)]">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapsed={() => setIsCollapsed((current) => !current)}
      />
      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-[1400px] px-6 py-10 sm:px-8 lg:px-12 lg:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
