"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingChatDock } from "@/components/layout/FloatingChatDock";

interface StorefrontChromeProps {
  children: React.ReactNode;
}

export function StorefrontChrome({ children }: StorefrontChromeProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <FloatingChatDock />
    </>
  );
}
