"use client";

import { useEffect, useState, type ReactNode, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { Footer } from "@/components/layout/Footer";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { AdminPermissionsProvider } from "@/lib/permissionsContext";
import { RevealRoot } from "@/components/shared/motion/RevealRoot";
import { RouteTransition } from "@/components/shared/motion/RouteTransition";

interface ShellProps {
  children: ReactNode;
  /** Replaces default `px-3 py-2 md:px-4 md:py-3` on the main scroll area when set. */
  contentClassName?: string;
}

export function Shell({ children, contentClassName }: ShellProps) {
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- navigation-driven UI reset
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
    <AdminPermissionsProvider>
      <Suspense fallback={null}>
        <RevealRoot />
      </Suspense>
      <NavigationProgress />
      <div className="flex min-h-screen flex-col bg-[var(--color-canvas-deep)] md:h-screen md:gap-2 md:overflow-hidden md:p-2">
        <div className="md:hidden">
          <MobileTopBar onOpenMenu={() => setIsMobileMenuOpen(true)} />
        </div>

        <TopHeader
          isCollapsed={isCollapsed}
          onToggleCollapsed={() => setIsCollapsed((current) => !current)}
        />

        <div className="flex min-h-0 flex-1 md:gap-2">
          <div className="hidden md:flex">
            <Sidebar isCollapsed={isCollapsed} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col md:gap-2">
            <main className="flex flex-1 flex-col overflow-hidden md:rounded-[var(--radius-lg)] md:border md:border-[var(--color-ink-100)] md:bg-[var(--color-surface)] md:shadow-[var(--shadow-sm)]">
              <RouteTransition>
                <div
                  className={
                    contentClassName ??
                    "flex-1 overflow-y-auto px-3 py-2 md:px-4 md:py-3"
                  }
                >
                  {children}
                </div>
              </RouteTransition>
            </main>

            <Footer />
          </div>
        </div>

        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>
    </AdminPermissionsProvider>
  );
}
