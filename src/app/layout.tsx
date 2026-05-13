import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { StorefrontChrome } from "@/components/layout/StorefrontChrome";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <StorefrontChrome>{children}</StorefrontChrome>
      </body>
    </html>
  );
}
