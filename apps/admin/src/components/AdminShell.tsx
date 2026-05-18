"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/Sidebar";
import { AdminTopHeader } from "@/components/AdminTopHeader";
import { AdminFooter } from "@/components/AdminFooter";
import { AdminMobileTopBar } from "@/components/AdminMobileTopBar";
import { AdminMobileMenu } from "@/components/AdminMobileMenu";

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl = pathname ? `?callbackUrl=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${callbackUrl}`);
    }
  }, [status, pathname, router]);

  // Close the mobile menu whenever the visitor navigates. This is a
  // "command on prop change" — the canonical React 19 escape hatch is
  // `useEffectEvent`, which is still experimental, so we use a plain effect
  // and silence the rule with an explicit reason.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- navigation-driven UI reset; see React docs on closing UI on route change
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (status !== "authenticated") {
    return (
      <div className="grid h-screen place-items-center bg-[var(--color-canvas)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-500)]">
          Loading admin…
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-canvas-deep)] md:h-screen md:gap-3 md:overflow-hidden md:p-3">
      <div className="md:hidden">
        <AdminMobileTopBar onOpenMenu={() => setIsMobileMenuOpen(true)} />
      </div>

      <AdminTopHeader
        isCollapsed={isCollapsed}
        onToggleCollapsed={() => setIsCollapsed((current) => !current)}
      />

      <div className="flex min-h-0 flex-1 md:gap-3">
        <div className="hidden md:flex">
          <Sidebar isCollapsed={isCollapsed} />
        </div>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden md:rounded-[var(--radius-lg)] md:border md:border-[var(--color-ink-100)] md:bg-[var(--color-surface)] md:shadow-[var(--shadow-sm)]">
          <div className="flex-1 overflow-y-auto px-4 py-3 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>

      <AdminFooter />

      <AdminMobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </div>
  );
}
