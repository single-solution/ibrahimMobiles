"use client";

import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileBottomTabBar } from "@/components/layout/MobileBottomTabBar";
import { MobileMenuSheet } from "@/components/layout/MobileMenuSheet";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { ChatFabShell } from "@/components/chat/ChatFabShell";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { RevealRoot } from "@/components/motion/RevealRoot";
import { RouteTransition } from "@/components/motion/RouteTransition";

interface StorefrontChromeProps {
  children: React.ReactNode;
}

export function StorefrontChrome({ children }: StorefrontChromeProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (isAdminRoute) {
    return <>{children}</>;
  }

  const isProductDetail =
    pathname?.startsWith("/shop/") && pathname !== "/shop" && pathname !== "/shop/";

  // We deliberately do NOT key `<main>` on `pathname`. Keying re-mounts the
  // element on every route change and makes navigation feel laggy. Instead,
  // `RouteTransition` applies a light cross-fade when the route commits.
  return (
    <div className="app-shell-pad">
      <Suspense fallback={null}>
        <RevealRoot />
      </Suspense>
      {/*
       * `NavigationProgress` reads `useSearchParams()` to detect query-only
       * route changes. In Next 16 any component that calls
       * `useSearchParams()` must sit inside a Suspense boundary on routes
       * that are statically prerendered — otherwise the build bails on
       * `/_not-found` with "missing-suspense-with-csr-bailout". The
       * progress bar has no SSR-visible state worth showing (it's a 2px
       * accent line that appears on click), so a null fallback is correct.
       */}
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Header onOpenSearch={() => setIsSearchOpen(true)} />
      <MobileHeader onOpenSearch={() => setIsSearchOpen(true)} />
      <main className="page-enter min-h-[calc(100dvh-var(--mobile-header-h)-var(--mobile-tabbar-h))] md:min-h-[calc(100dvh-var(--desktop-header-h))]">
        <Suspense fallback={children}>
          <RouteTransition>{children}</RouteTransition>
        </Suspense>
      </main>
      <Footer />
      <ChatFabShell hideOnMobile={Boolean(isProductDetail)} />
      <MobileBottomTabBar
        onOpenMenu={() => setIsMenuOpen(true)}
        isMenuOpen={isMenuOpen}
      />
      <MobileMenuSheet isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
