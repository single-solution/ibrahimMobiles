"use client";

import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileBottomTabBar } from "@/components/layout/MobileBottomTabBar";
import { MobileMenuSheet } from "@/components/layout/MobileMenuSheet";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { FloatingChatDock } from "@/components/layout/FloatingChatDock";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { RevealRoot } from "@/components/motion/RevealRoot";

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
  // element on every route change, which re-runs the 320ms `.page-enter`
  // fade and makes navigation feel laggy. Without the key, Next.js swaps
  // children in place — the route's `loading.tsx` skeleton (and then its
  // real content) appears instantly. The entry animation still plays once,
  // on the initial mount.
  //
  // The `min-h-[...]` on <main> is a layout-stability guarantee: without it,
  // any moment where `children` renders empty (the brief gap between
  // `loading.tsx` unmounting and the page's static parts mounting on a
  // slow compile, an under-tall route skeleton, or a hydration re-render)
  // would let the footer pop up into the viewport. Reserving at least the
  // visible viewport minus the chrome means the footer is always pinned
  // below the fold — the layout never collapses, no matter what's in flight.
  return (
    <div className="app-shell-pad">
      <RevealRoot />
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
      <main
        className="page-enter min-h-[calc(100dvh-var(--mobile-header-h)-var(--mobile-tabbar-h))] md:min-h-[calc(100dvh-var(--desktop-header-h))]"
      >
        {children}
      </main>
      <Footer />
      <FloatingChatDock hideOnMobile={Boolean(isProductDetail)} />
      <MobileBottomTabBar
        onOpenMenu={() => setIsMenuOpen(true)}
        isMenuOpen={isMenuOpen}
      />
      <MobileMenuSheet isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
