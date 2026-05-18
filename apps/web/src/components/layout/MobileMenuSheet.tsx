"use client";

import Link from "next/link";
import {
  Award,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Sparkles,
  Tag,
  Truck,
  User,
} from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  FacebookIcon,
  InstagramIcon,
  TiktokIcon,
  YoutubeIcon,
} from "@/components/ui/SocialIcons";
import { buildWhatsAppLink } from "@store/shared";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

interface MobileMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_LINKS = [
  { href: "/", label: "Home", icon: Sparkles },
  { href: "/shop", label: "Browse phones", icon: Award },
  { href: "/deals", label: "Today's deals", icon: Tag },
];

const ACCOUNT_LINKS = [
  { href: "/account", label: "Account", icon: User, sub: "Dashboard" },
  { href: "/account/orders", label: "Orders", icon: Package, sub: "History & status" },
  { href: "/track", label: "Track order", icon: Truck, sub: "Public lookup" },
];

export function MobileMenuSheet({ isOpen, onClose }: MobileMenuSheetProps) {
  const settings = useStoreSettings();
  const socialButtons = [
    { href: settings.socialFacebook, label: "Facebook", icon: <FacebookIcon size={16} /> },
    { href: settings.socialInstagram, label: "Instagram", icon: <InstagramIcon size={16} /> },
    { href: settings.socialTiktok, label: "TikTok", icon: <TiktokIcon size={16} /> },
    { href: settings.socialYoutube, label: "YouTube", icon: <YoutubeIcon size={16} /> },
  ];

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Menu"
      description="Browse, contact and quick links"
      height="auto"
      contentClassName="pb-3"
    >
      <section>
        <h3 className="px-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Browse
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="tap flex flex-col items-start gap-2 rounded-[12px] bg-[var(--color-canvas-deep)] p-2.5 active:bg-[var(--color-surface-muted)]"
              >
                <span className="grid size-7 place-items-center rounded-md bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
                  <Icon size={14} />
                </span>
                <span className="line-clamp-1 text-[13px] font-semibold leading-tight text-[var(--color-ink-900)]">
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="px-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Your account
        </h3>
        <div className="mt-2 space-y-1.5">
          {ACCOUNT_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="tap flex items-center gap-3 rounded-[12px] bg-[var(--color-canvas-deep)] px-3 py-2.5 active:bg-[var(--color-surface-muted)]"
              >
                <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-[var(--color-ink-900)]">{link.label}</p>
                  <p className="text-[11.5px] text-[var(--color-ink-500)]">{link.sub}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="px-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Talk to us
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <ContactTile
            href={buildWhatsAppLink("Salam!", settings.whatsappNumber)}
            icon={<MessageCircle size={14} />}
            label="WhatsApp"
            sub="Reply in mins"
            isExternal
          />
          <ContactTile
            href={`tel:${settings.supportPhone.replace(/\s+/g, "")}`}
            icon={<Phone size={14} />}
            label={settings.supportPhone}
            sub="11am – 10pm"
          />
          <ContactTile
            href={`mailto:${settings.supportEmail}`}
            icon={<Mail size={14} />}
            label="Email"
            sub={settings.supportEmail}
          />
          <ContactTile
            href={settings.socialGoogleMaps}
            icon={<MapPin size={14} />}
            label={settings.storeAddressLine1}
            sub={settings.storeAddressLine2}
            isExternal
          />
        </div>
      </section>

      <section className="mt-5">
        <h3 className="px-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Follow
        </h3>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {socialButtons.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="flex h-10 items-center justify-center rounded-[10px] bg-[var(--color-canvas-deep)] text-[var(--color-ink-700)] active:bg-[var(--color-surface-muted)]"
            >
              {social.icon}
            </a>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <Link
          href="/admin"
          onClick={onClose}
          className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] px-4 text-[13px] font-semibold text-[var(--color-ink-800)]"
        >
          <LayoutDashboard size={14} />
          Open admin dashboard
        </Link>
      </section>
    </BottomSheet>
  );
}

interface ContactTileProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  sub?: string;
  isExternal?: boolean;
}

function ContactTile({ href, icon, label, sub, isExternal }: ContactTileProps) {
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="flex flex-col items-start gap-1.5 rounded-[12px] bg-[var(--color-canvas-deep)] p-2.5 active:bg-[var(--color-surface-muted)]"
    >
      <span className="grid size-7 place-items-center rounded-md bg-[var(--color-surface)] text-[var(--color-accent-700)] shadow-[var(--shadow-sm)]">
        {icon}
      </span>
      <div className="min-w-0 w-full">
        <p className="truncate text-[12.5px] font-semibold leading-tight text-[var(--color-ink-900)]">{label}</p>
        {sub && <p className="truncate text-[11px] leading-tight text-[var(--color-ink-500)] mt-0.5">{sub}</p>}
      </div>
    </a>
  );
}
