"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { CartDropdown } from "@/app/cart/_components/CartDropdown";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileBottomTabBar } from "@/components/layout/MobileBottomTabBar";
import { RevealRoot } from "@/components/shared/motion/RevealRoot";
import { RouteTransition } from "@/components/shared/motion/RouteTransition";

/* Deferred client islands — their JS is split into separate chunks and is
   not part of the initial bundle. We mount them on the next idle frame
   (or 1.5 s after FCP at the latest) to cut Total Blocking Time. If the
   user interacts with their trigger before idle fires, the interaction
   handlers below force the gate open immediately so the menu / search
   still respond — at the cost of a one-frame delay during which Next.js
   loads the chunk. Open / close animations are preserved because the
   first render with `isOpen=true` follows React's normal mount path. */
const WebVitalsReporter = dynamic(
  () =>
    import("@/components/layout/WebVitalsReporter").then(
      (m) => m.WebVitalsReporter,
    ),
  { ssr: false, loading: () => null },
);
const NavigationProgress = dynamic(
  () =>
    import("@/components/layout/NavigationProgress").then(
      (m) => m.NavigationProgress,
    ),
  { ssr: false, loading: () => null },
);
const ChatFabShell = dynamic(
  () =>
    import("@/app/_components/chat/ChatFabShell").then((m) => m.ChatFabShell),
  { ssr: false, loading: () => null },
);
const SearchOverlay = dynamic(
  () =>
    import("@/components/layout/SearchOverlay").then((m) => m.SearchOverlay),
  { ssr: false, loading: () => null },
);

interface StorefrontChromeProps {
  children: React.ReactNode;
}

/** Hard ceiling on the idle wait so even a busy main thread can't keep
 *  the chat FAB / nav progress bar / vitals reporter hidden forever. */
const DEFERRED_MOUNT_TIMEOUT_MS = 1500;

export function StorefrontChrome({ children }: StorefrontChromeProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [areDeferredMounted, setAreDeferredMounted] = useState(false);

  // Cart closes on every route commit — navigating from the popover should
  // never leave the panel hanging open over the next page.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- navigation-driven UI reset
    setIsCartOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (areDeferredMounted) return;
    const supportsIdle = typeof window.requestIdleCallback === "function";
    if (supportsIdle) {
      const handle = window.requestIdleCallback(
        () => setAreDeferredMounted(true),
        { timeout: DEFERRED_MOUNT_TIMEOUT_MS },
      );
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(
      () => setAreDeferredMounted(true),
      DEFERRED_MOUNT_TIMEOUT_MS,
    );
    return () => window.clearTimeout(handle);
  }, [areDeferredMounted]);

  /* If the user taps the search trigger before the idle callback fires,
     force-mount the deferred chunks immediately so the overlay can render
     in response. Without this, an extremely fast tap (< 1.5 s after FCP)
     would no-op until the gate opened. */
  const openSearch = useCallback(() => {
    setAreDeferredMounted(true);
    setIsSearchOpen(true);
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

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
      {areDeferredMounted ? <WebVitalsReporter /> : null}
      {/*
       * `NavigationProgress` reads `useSearchParams()` to detect query-only
       * route changes. In Next 16 any component that calls
       * `useSearchParams()` must sit inside a Suspense boundary on routes
       * that are statically prerendered — otherwise the build bails on
       * `/_not-found` with "missing-suspense-with-csr-bailout". The
       * progress bar has no SSR-visible state worth showing (it's a 2px
       * accent line that appears on click), so a null fallback is correct.
       */}
      {areDeferredMounted ? (
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
      ) : null}
      <Header
        onOpenSearch={openSearch}
        onOpenCart={openCart}
        isCartOpen={isCartOpen}
      />
      <MobileHeader
        onOpenSearch={openSearch}
        onOpenCart={openCart}
        isCartOpen={isCartOpen}
      />
      <main className="page-enter min-h-[calc(100dvh-var(--mobile-header-h)-var(--mobile-tabbar-h))] md:min-h-[calc(100dvh-var(--desktop-header-h))]">
        <Suspense fallback={children}>
          <RouteTransition>{children}</RouteTransition>
        </Suspense>
      </main>
      <Footer />
      {areDeferredMounted ? (
        <ChatFabShell mobileStackedAbove={isProductDetail ? "pdp-cta" : null} />
      ) : null}
      <MobileBottomTabBar />
      <CartDropdown open={isCartOpen} onClose={closeCart} />
      {areDeferredMounted ? (
        <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      ) : null}
    </div>
  );
}
