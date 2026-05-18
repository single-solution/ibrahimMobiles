import type { Metadata, Viewport } from "next";
import { getStoreSettings } from "@store/db";

import { ToastProvider } from "@/components/Toast";
import { AdminSessionProvider } from "@/components/AdminSessionProvider";
import { StoreSettingsProvider } from "@/lib/storeSettingsContext";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getStoreSettings();
  return {
    title: {
      default: `${siteName} · Admin`,
      template: `%s · ${siteName} Admin`,
    },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

interface AdminRootLayoutProps {
  children: React.ReactNode;
}

export default async function AdminRootLayout({ children }: AdminRootLayoutProps) {
  // Pulled at the layout boundary so admin chrome (header/footer/menu/login)
  // can show the live store name without each page refetching it. The helper
  // has its own short-lived cache, so the cost per request is negligible.
  const settings = await getStoreSettings();

  return (
    <html lang="en">
      <body>
        <AdminSessionProvider>
          <StoreSettingsProvider value={settings}>
            <ToastProvider>{children}</ToastProvider>
          </StoreSettingsProvider>
        </AdminSessionProvider>
      </body>
    </html>
  );
}
