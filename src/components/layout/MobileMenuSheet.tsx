"use client";

import Link from "next/link";
import {
  Award,
  Facebook,
  Instagram,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Sparkles,
  Tag,
  Youtube,
} from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  SOCIAL_LINKS,
  STORE_ADDRESS_LINE_1,
  STORE_ADDRESS_LINE_2,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  buildWhatsAppLink,
} from "@/lib/constants";

interface MobileMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_LINKS = [
  { href: "/shop", label: "Shop all phones", icon: Sparkles },
  { href: "/shop?grade=A%2B", label: "Grade A+ only", icon: Award },
  { href: "/deals", label: "Today's deals", icon: Tag },
  { href: "/about", label: "About & policies", icon: MapPin },
];

const SOCIAL_BUTTONS = [
  { href: SOCIAL_LINKS.facebook, label: "Facebook", icon: <Facebook size={16} /> },
  { href: SOCIAL_LINKS.instagram, label: "Instagram", icon: <Instagram size={16} /> },
  { href: SOCIAL_LINKS.tiktok, label: "TikTok", icon: <Music2 size={16} /> },
  { href: SOCIAL_LINKS.youtube, label: "YouTube", icon: <Youtube size={16} /> },
];

export function MobileMenuSheet({ isOpen, onClose }: MobileMenuSheetProps) {
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
                className="flex flex-col items-start gap-2 rounded-[12px] bg-[var(--color-canvas-deep)] p-2.5 active:scale-[0.99] active:bg-[var(--color-surface-muted)]"
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
          Talk to us
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <ContactTile
            href={buildWhatsAppLink("Salam!")}
            icon={<MessageCircle size={14} />}
            label="WhatsApp"
            sub="Reply in mins"
            external
          />
          <ContactTile
            href={`tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`}
            icon={<Phone size={14} />}
            label={SUPPORT_PHONE}
            sub="11am – 10pm"
          />
          <ContactTile
            href={`mailto:${SUPPORT_EMAIL}`}
            icon={<Mail size={14} />}
            label="Email"
            sub={SUPPORT_EMAIL}
          />
          <ContactTile
            href={SOCIAL_LINKS.googleMaps}
            icon={<MapPin size={14} />}
            label={STORE_ADDRESS_LINE_1}
            sub={STORE_ADDRESS_LINE_2}
            external
          />
        </div>
      </section>

      <section className="mt-5">
        <h3 className="px-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Follow
        </h3>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {SOCIAL_BUTTONS.map((social) => (
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
  external?: boolean;
}

function ContactTile({ href, icon, label, sub, external }: ContactTileProps) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
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
