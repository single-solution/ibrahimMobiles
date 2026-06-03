import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Oswald } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { AppShell } from "@/components/layout/AppShell";
import {
  MarketingPixels,
  MarketingPixelsNoScript,
} from "@/app/_components/marketing/MarketingPixels";
import { getBaseUrl } from "@/lib/core/baseUrl";
import {
  getAttributesCached,
  getCategoriesCached,
  getGradesCached,
  getStoreSettingsCached,
} from "@/lib/core/cached";
import { getChatSettings } from "@/lib/chat/chatSettings";
import { ChatSettingsProvider } from "@/lib/chat/chatSettingsContext";
import { getSeoSettings } from "@/lib/seo/seoSettings";
import { getGoogleSiteVerification } from "@/lib/seo/googleVerification";
import { StoreSettingsProvider } from "@/lib/core/storeSettingsContext";
import {
  ReferenceProvider,
  type CategoryReference,
  type ReferenceData,
} from "@/lib/core/storefrontReferenceContext";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  axes: ["opsz"],
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
});

const STOREFRONT_BASE_URL = getBaseUrl();

export async function generateMetadata(): Promise<Metadata> {
  const [
    { siteName, siteTagline, brandFaviconLight, brandFaviconDark },
    seoSettings,
    googleVerification,
  ] = await Promise.all([
    getStoreSettingsCached(),
    getSeoSettings(),
    getGoogleSiteVerification(),
  ]);
  const defaultOg = seoSettings.defaultOgImageUrl || undefined;

  /* Build the favicon descriptor list dynamically so the browser
     gets the admin-uploaded mark when present and falls back to the
     bundled `/favicon.ico` when neither variant is set. When both
     variants exist, the `media` queries let the browser pick the
     right one for the user's system theme; if only one is set we
     publish it without a media query so it applies everywhere. */
  const faviconLight = brandFaviconLight.trim();
  const faviconDark = brandFaviconDark.trim();
  const iconDescriptors: Array<{ url: string; media?: string }> = [];
  if (faviconLight && faviconDark) {
    iconDescriptors.push({ url: faviconLight, media: "(prefers-color-scheme: light)" });
    iconDescriptors.push({ url: faviconDark, media: "(prefers-color-scheme: dark)" });
  } else if (faviconLight) {
    iconDescriptors.push({ url: faviconLight });
  } else if (faviconDark) {
    iconDescriptors.push({ url: faviconDark });
  } else {
    iconDescriptors.push({ url: "/favicon.ico" });
  }
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
      images: defaultOg ? [defaultOg] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} — ${siteTagline}`,
      description: siteTagline,
      images: defaultOg ? [defaultOg] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: iconDescriptors,
    },
    formatDetection: {
      telephone: false,
    },
    verification: googleVerification ? { google: googleVerification } : undefined,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /* Mirrors `--color-canvas` — the browser chrome tints to match the
     storefront's light surface. */
  themeColor: "#f8fbf8",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

async function loadStorefrontReference(): Promise<ReferenceData> {
  // Both reads are short, fully cached, and tag-revalidated by admin
  // mutations. Fetch in parallel — they're independent.
  try {
    const [grades, attributes, rawCategories] = await Promise.all([
      getGradesCached(),
      getAttributesCached(),
      getCategoriesCached(),
    ]);
    const categories: CategoryReference[] = rawCategories.map(
      (category) => ({
        slug: category.slug,
        label: category.label,
        description: category.description,
        icon: category.icon,
        iconNode: category.iconNode,
        isActive: category.isActive,
        sortOrder: category.sortOrder,
      }),
    );
    return { grades, attributes, categories };
  } catch {
    // Atlas hiccup at boot must not crash the root layout — the page can
    // still render with empty grades/categories and a skeleton UI.
    return { grades: [], attributes: [], categories: [] };
  }
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const [settings, reference, chatSettings] = await Promise.all([
    getStoreSettingsCached(),
    loadStorefrontReference(),
    getChatSettings(),
  ]);
  return (
    <html
      lang="en"
      className={`${bricolageGrotesque.variable} ${oswald.variable} no-js`}
      // Tells Next.js the smooth scroll on <html> is intentional and that
      // it should *disable* it temporarily during route transitions
      // (otherwise jumping to a new page does a multi-second scroll
      // animation back to the top). Required by Next 16+ to silence the
      // "missing-data-scroll-behavior" warning.
      data-scroll-behavior="smooth"
      // `no-js` is stripped by `RevealRoot` once it mounts — not by the
      // old inline `<script>` that ran before the animation driver was
      // ready. That race was leaving `.reveal` elements invisible on
      // slow networks between the strip and hydration. Suppress here
      // because the className will diverge after hydration as planned.
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to the image hosts the LCP candidate will fetch
           from. Saves ~100–250 ms on a cold visit by parallelising the
           TLS/DNS handshake with HTML parsing. Kept tight: only hosts
           that actually serve product imagery. */}
        <link
          rel="preconnect"
          href="https://images.unsplash.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://cdn.simpleicons.org"
          crossOrigin="anonymous"
        />
        {/* Speculation Rules — Chrome/Edge will prerender same-origin
           links once a pointer/touch lands on them. `conservative`
           eagerness means no prerender until the user is clearly about
           to click, so wasted bandwidth on visits that never happen is
           minimal. Excludes admin, account, checkout, sign-in (auth /
           dynamic-by-session) and API routes (non-navigational). Other
           browsers silently ignore the tag — pure upside for Chromium.
           Network Information API is respected by Chrome itself: Data
           Saver / 2g connections skip the prerender automatically. */}
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prerender: [
                {
                  source: "document",
                  where: {
                    and: [
                      { href_matches: "/*" },
                      {
                        not: {
                          href_matches: [
                            "/admin/*",
                            "/account/*",
                            "/checkout/*",
                            "/api/*",
                            "/sign-in*",
                          ],
                        },
                      },
                    ],
                  },
                  eagerness: "conservative",
                },
              ],
            }),
          }}
        />
        <MarketingPixels
          metaPixelId={settings.metaPixelId}
          googleAnalyticsId={settings.googleAnalyticsId}
          googleTagManagerId={settings.googleTagManagerId}
          tiktokPixelId={settings.tiktokPixelId}
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
        <MarketingPixelsNoScript googleTagManagerId={settings.googleTagManagerId} />
        <StoreSettingsProvider value={settings}>
          <ChatSettingsProvider value={chatSettings}>
            <ReferenceProvider value={reference}>
              <AppShell footer={<Footer settings={settings} />}>
                {children}
              </AppShell>
            </ReferenceProvider>
          </ChatSettingsProvider>
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
