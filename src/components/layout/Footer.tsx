import Link from "next/link";
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  ShoppingBag,
  Youtube,
} from "lucide-react";
import {
  PAYMENT_METHODS,
  SERVICE_CITIES,
  SITE_NAME,
  SITE_TAGLINE,
  SOCIAL_LINKS,
  STORE_ADDRESS_LINE_1,
  STORE_ADDRESS_LINE_2,
  STORE_HOURS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  buildWhatsAppLink,
} from "@/lib/constants";

const SOCIAL_BUTTONS = [
  { href: SOCIAL_LINKS.facebook, label: "Facebook", icon: <Facebook size={15} /> },
  { href: SOCIAL_LINKS.instagram, label: "Instagram", icon: <Instagram size={15} /> },
  { href: SOCIAL_LINKS.tiktok, label: "TikTok", icon: <Music2 size={15} /> },
  { href: SOCIAL_LINKS.youtube, label: "YouTube", icon: <Youtube size={15} /> },
];

export function Footer() {
  return (
    <footer className="mt-24 hidden border-t border-[var(--color-ink-100)] bg-[var(--color-ink-900)] text-[var(--color-ink-200)] md:block">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5 text-white">
              <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
                <ShoppingBag size={16} strokeWidth={2.4} />
              </span>
              <span className="font-semibold text-2xl tracking-tight">{SITE_NAME}</span>
            </Link>
            <p className="max-w-xs text-sm text-[var(--color-ink-300)]">{SITE_TAGLINE}</p>
            <div className="space-y-2 pt-2 text-sm">
              <ContactRow
                icon={<MessageCircle size={14} />}
                label="WhatsApp us"
                href={buildWhatsAppLink("Salam!")}
              />
              <ContactRow
                icon={<Phone size={14} />}
                label={SUPPORT_PHONE}
                href={`tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`}
              />
              <ContactRow
                icon={<Mail size={14} />}
                label={SUPPORT_EMAIL}
                href={`mailto:${SUPPORT_EMAIL}`}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {SOCIAL_BUTTONS.map((socialButton) => (
                <a
                  key={socialButton.label}
                  href={socialButton.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={socialButton.label}
                  className="grid size-9 place-items-center rounded-[var(--radius-md)] border border-[var(--color-ink-700)] bg-[var(--color-ink-800)] text-[var(--color-ink-300)] transition-colors hover:border-[var(--color-accent-500)] hover:bg-[var(--color-accent-700)] hover:text-white"
                >
                  {socialButton.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-400)]">
              Visit our store
            </h4>
            <p className="mt-3 text-sm text-[var(--color-ink-200)]">
              {STORE_ADDRESS_LINE_1}<br />
              {STORE_ADDRESS_LINE_2}
            </p>
            <p className="mt-1 text-xs text-[var(--color-ink-400)]">{STORE_HOURS}</p>
            <a
              href={SOCIAL_LINKS.googleMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)]"
            >
              <MapPin size={12} />
              Open in Google Maps →
            </a>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-400)]">
              Payment methods
            </h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((paymentMethod) => (
                <span
                  key={paymentMethod.id}
                  className="rounded-[var(--radius-md)] border border-[var(--color-ink-700)] bg-[var(--color-ink-800)] px-3 py-1.5 text-xs text-[var(--color-ink-200)]"
                >
                  {paymentMethod.label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-400)]">
              Delivering across Pakistan
            </h4>
            <p className="mt-3 text-sm text-[var(--color-ink-300)]">
              {SERVICE_CITIES.join(" · ")}
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--color-ink-700)] pt-6 text-xs text-[var(--color-ink-400)] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</span>
          <span>Pre-owned phones, graded honestly. Warranty on every device.</span>
        </div>
      </div>
    </footer>
  );
}

interface ContactRowProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  isExternal?: boolean;
}

function ContactRow({ icon, label, href, isExternal = false }: ContactRowProps) {
  const content = (
    <span className="flex items-start gap-2 text-[var(--color-ink-300)]">
      <span className="mt-0.5 text-[var(--color-accent-400)]">{icon}</span>
      <span>{label}</span>
    </span>
  );
  if (!href) {
    return content;
  }
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="hover:text-[var(--color-accent-300)]"
    >
      {content}
    </a>
  );
}
