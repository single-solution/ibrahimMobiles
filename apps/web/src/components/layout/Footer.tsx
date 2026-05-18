"use client";

import Link from "next/link";
import { MessageCircle, ShoppingBag } from "lucide-react";

import { buildWhatsAppLink } from "@store/shared";

import {
  FacebookIcon,
  InstagramIcon,
  TiktokIcon,
  YoutubeIcon,
} from "@/components/ui/SocialIcons";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

export function Footer() {
  const settings = useStoreSettings();
  const socialButtons = [
    { href: settings.socialFacebook, label: "Facebook", icon: <FacebookIcon size={15} /> },
    { href: settings.socialInstagram, label: "Instagram", icon: <InstagramIcon size={15} /> },
    { href: settings.socialTiktok, label: "TikTok", icon: <TiktokIcon size={15} /> },
    { href: settings.socialYoutube, label: "YouTube", icon: <YoutubeIcon size={15} /> },
  ];

  return (
    <footer className="mt-14 border-t border-[var(--color-ink-100)] bg-[var(--color-ink-900)] text-[var(--color-ink-200)] sm:mt-24">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
            <Link href="/" className="brand-lockup flex items-center gap-2.5 text-white">
              <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
                <ShoppingBag size={16} strokeWidth={2.4} />
              </span>
              <span className="text-2xl font-semibold tracking-tight">{settings.siteName}</span>
            </Link>
            <span className="hidden h-6 w-px bg-[var(--color-ink-700)] sm:block" />
            <p className="max-w-xs text-sm text-[var(--color-ink-400)]">{settings.siteTagline}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={buildWhatsAppLink("Salam!", settings.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="tap inline-flex h-10 items-center gap-2 rounded-full bg-[var(--color-whatsapp)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-whatsapp-dark)]"
            >
              <MessageCircle size={15} className="fill-white" />
              Chat on WhatsApp
            </a>
            <div className="flex items-center gap-1.5">
              {socialButtons.map((socialButton) => (
                <a
                  key={socialButton.label}
                  href={socialButton.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={socialButton.label}
                  className="tap grid size-9 place-items-center rounded-[var(--radius-md)] border border-[var(--color-ink-700)] bg-[var(--color-ink-800)] text-[var(--color-ink-300)] transition-colors hover:border-[var(--color-accent-500)] hover:bg-[var(--color-accent-700)] hover:text-white"
                >
                  {socialButton.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-1.5 border-t border-[var(--color-ink-700)] pt-5 text-center text-xs text-[var(--color-ink-400)] sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>
            © {new Date().getFullYear()} {settings.siteName}. All rights reserved.
          </span>
          <span>Pre-owned phones, graded honestly. Delivers across Pakistan.</span>
        </div>
      </div>
    </footer>
  );
}
