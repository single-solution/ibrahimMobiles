"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";
import { AdminMobileTopBar } from "@/components/admin/AdminMobileTopBar";
import { AdminMobileMenu } from "@/components/admin/AdminMobileMenu";
import { ADMIN_SESSION_KEY } from "@/components/admin/adminSession";

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const isSignedIn = window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";
    if (!isSignedIn) {
      router.replace("/admin/login");
      return;
    }
    setIsHydrated(true);
  }, [router, pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
    <div className="flex min-h-screen bg-[var(--color-canvas-deep)] md:h-screen md:overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapsed={() => setIsCollapsed((current) => !current)}
        />
      </div>

      <main className="flex min-w-0 flex-1 flex-col md:h-screen md:overflow-y-auto">
        <AdminMobileTopBar onOpenMenu={() => setIsMobileMenuOpen(true)} />
        <div className="mx-auto w-full max-w-[1400px] px-4 py-3 md:px-10 md:py-10">
          {children}
        </div>
      </main>

      <AdminMobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </div>
  );
}
