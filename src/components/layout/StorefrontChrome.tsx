"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileFooter } from "@/components/layout/MobileFooter";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileBottomTabBar } from "@/components/layout/MobileBottomTabBar";
import { MobileMenuSheet } from "@/components/layout/MobileMenuSheet";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { FloatingChatDock } from "@/components/layout/FloatingChatDock";

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

  return (
    <div className="app-shell-pad">
      <Header />
      <MobileHeader onOpenSearch={() => setIsSearchOpen(true)} />
      <main>{children}</main>
      <Footer />
      <MobileFooter />
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
