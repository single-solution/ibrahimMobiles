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
      <section className="space-y-1.5">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-canvas-deep)] px-4 py-3.5 text-[15px] font-medium text-[var(--color-ink-900)] active:scale-[0.99] active:bg-[var(--color-surface-muted)]"
            >
              <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
                <Icon size={18} />
              </span>
              <span className="flex-1">{link.label}</span>
            </Link>
          );
        })}
      </section>

      <section className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
          Talk to us
        </h3>
        <div className="mt-2 space-y-1.5">
          <ContactRow
            href={buildWhatsAppLink("Salam!")}
            icon={<MessageCircle size={16} />}
            label="WhatsApp"
            sub="Reply within minutes"
            external
          />
          <ContactRow
            href={`tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`}
            icon={<Phone size={16} />}
            label={SUPPORT_PHONE}
            sub="Call us · 11am–10pm"
          />
          <ContactRow
            href={`mailto:${SUPPORT_EMAIL}`}
            icon={<Mail size={16} />}
            label={SUPPORT_EMAIL}
            sub="Email"
          />
          <ContactRow
            href={SOCIAL_LINKS.googleMaps}
            icon={<MapPin size={16} />}
            label={STORE_ADDRESS_LINE_1}
            sub={STORE_ADDRESS_LINE_2}
            external
          />
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
          Follow
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {SOCIAL_BUTTONS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="grid size-11 place-items-center rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] text-[var(--color-ink-700)] active:bg-[var(--color-surface-muted)]"
            >
              {social.icon}
            </a>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <Link
          href="/admin"
          onClick={onClose}
          className="flex items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] px-4 py-3 text-sm font-semibold text-[var(--color-ink-800)]"
        >
          <LayoutDashboard size={16} />
          Open admin dashboard
        </Link>
      </section>
    </BottomSheet>
  );
}

interface ContactRowProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  sub?: string;
  external?: boolean;
}

function ContactRow({ href, icon, label, sub, external }: ContactRowProps) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-canvas-deep)] px-4 py-3 active:bg-[var(--color-surface-muted)]"
    >
      <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-surface)] text-[var(--color-accent-700)] shadow-[var(--shadow-sm)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">{label}</p>
        {sub && <p className="truncate text-xs text-[var(--color-ink-500)]">{sub}</p>}
      </div>
    </a>
  );
}
