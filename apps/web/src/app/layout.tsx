import type { Metadata, Viewport } from "next";
import {
  Anton,
  Barlow_Condensed,
  Bricolage_Grotesque,
  Oswald,
} from "next/font/google";
import { StorefrontChrome } from "@/components/layout/StorefrontChrome";
import { getStorefrontBaseUrl } from "@/lib/storefront/baseUrl";
import { getStoreSettingsCached } from "@/lib/storefront/cached";
import { StoreSettingsProvider } from "@/lib/storefront/storeSettingsContext";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  axes: ["opsz"],
});

const anton = Anton({
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
  weight: "400",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const STOREFRONT_BASE_URL = getStorefrontBaseUrl();

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, siteTagline } = await getStoreSettingsCached();
  return {
    metadataBase: new URL(STOREFRONT_BASE_URL),
    title: {
      default: `${siteName} — ${siteTagline}`,
      template: `%s · ${siteName}`,
    },
    description: siteTagline,
    applicationName: siteName,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      siteName: siteName,
      title: `${siteName} — ${siteTagline}`,
      description: siteTagline,
      url: STOREFRONT_BASE_URL,
      locale: "en_PK",
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} — ${siteTagline}`,
      description: siteTagline,
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: "/favicon.ico",
    },
    formatDetection: {
      telephone: false,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const settings = await getStoreSettingsCached();
  return (
    <html
      lang="en"
      className={`${bricolageGrotesque.variable} ${anton.variable} ${oswald.variable} ${barlowCondensed.variable} no-js`}
      // Tells Next.js the smooth scroll on <html> is intentional and that
      // it should *disable* it temporarily during route transitions
      // (otherwise jumping to a new page does a multi-second scroll
      // animation back to the top). Required by Next 16+ to silence the
      // "missing-data-scroll-behavior" warning.
      data-scroll-behavior="smooth"
      // We intentionally let the inline `<script>` below strip `no-js` from
      // <html> before React hydrates — this is the canonical progressive-
      // enhancement pattern, so the resulting className diff is expected,
      // not a bug.
      suppressHydrationWarning
    >
      <head>
        {/* Strip the no-js fallback the moment JS executes so reveal animations work. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.remove('no-js');",
          }}
        />
      </head>
      <body
        // Browser extensions (Grammarly, ColorZilla, password managers,
        // etc.) inject `data-*` attributes onto <body> before React
        // hydrates. Those attributes are out of our control and React
        // can't safely diff them, so we suppress the warning here. This
        // does NOT suppress mismatches in our own components.
        suppressHydrationWarning
      >
        <StoreSettingsProvider value={settings}>
          <StorefrontChrome>{children}</StorefrontChrome>
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
