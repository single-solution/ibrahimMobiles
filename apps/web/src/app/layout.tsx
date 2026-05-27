import type { Metadata, Viewport } from "next";
import { Anton, Bricolage_Grotesque, Oswald } from "next/font/google";
import { StorefrontChrome } from "@/components/layout/StorefrontChrome";
import {
  MarketingPixels,
  MarketingPixelsNoScript,
} from "@/components/marketing/MarketingPixels";
import { getStorefrontBaseUrl } from "@/lib/storefront/baseUrl";
import {
  getStorefrontAttributesCached,
  getStorefrontCategoriesCached,
  getStorefrontGradesCached,
  getStoreSettingsCached,
} from "@/lib/storefront/cached";
import { getChatSettings } from "@/lib/chat/chatSettings";
import { ChatSettingsProvider } from "@/lib/chat/chatSettingsContext";
import { getSeoSettings } from "@/lib/seo/seoSettings";
import { getGoogleSiteVerification } from "@/lib/seo/googleVerification";
import { StoreSettingsProvider } from "@/lib/storefront/storeSettingsContext";
import {
  StorefrontReferenceProvider,
  type StorefrontCategoryReference,
  type StorefrontReferenceData,
} from "@/lib/storefront/storefrontReferenceContext";
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

const STOREFRONT_BASE_URL = getStorefrontBaseUrl();

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
  themeColor: "#ffffff",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

async function loadStorefrontReference(): Promise<StorefrontReferenceData> {
  // Both reads are short, fully cached, and tag-revalidated by admin
  // mutations. Fetch in parallel — they're independent.
  try {
    const [grades, attributes, rawCategories] = await Promise.all([
      getStorefrontGradesCached(),
      getStorefrontAttributesCached(),
      getStorefrontCategoriesCached(),
    ]);
    const categories: StorefrontCategoryReference[] = rawCategories.map(
      (category) => ({
        slug: category.slug,
        label: category.label,
        description: category.description,
        icon: category.icon,
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
      className={`${bricolageGrotesque.variable} ${anton.variable} ${oswald.variable} no-js`}
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
            <StorefrontReferenceProvider value={reference}>
              <StorefrontChrome>{children}</StorefrontChrome>
            </StorefrontReferenceProvider>
          </ChatSettingsProvider>
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
