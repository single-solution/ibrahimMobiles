"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SITE_NAME, SUPPORT_PHONE, buildWhatsAppLink } from "@/lib/constants";
import { classNames } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/deals", label: "Deals" },
  { href: "/shop?grade=A%2B", label: "Grade A+" },
  { href: "/about", label: "About" },
] as const;

export function Header() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  function handleMobileNavToggle() {
    setIsMobileNavOpen((previous) => !previous);
  }

  function handleMobileNavClose() {
    setIsMobileNavOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)]/85 backdrop-blur">
      <SupportStrip />

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[var(--color-ink-900)]"
          onClick={handleMobileNavClose}
          aria-label={SITE_NAME}
        >
          <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-700)] text-white">
            <ShoppingBag size={16} strokeWidth={2.4} />
          </span>
          <span className="font-semibold text-2xl leading-none tracking-tight">{SITE_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((navLink) => (
            <Link
              key={navLink.href}
              href={navLink.href}
              className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink-900)]"
            >
              {navLink.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden flex-1 max-w-sm md:block">
          <Input
            name="header-search"
            placeholder="Search iPhone, Galaxy, Pixel…"
            leadingIcon={<Search size={16} />}
            aria-label="Search phones"
          />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <IconButton ariaLabel="Wishlist">
            <Heart size={18} />
          </IconButton>
          <IconButton ariaLabel="Cart" badgeCount={2}>
            <ShoppingBag size={18} />
          </IconButton>
          <Link
            href="/admin"
            className="ml-1 hidden h-10 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-ink-800)] transition-colors hover:border-[var(--color-ink-900)] hover:text-[var(--color-ink-900)] sm:inline-flex"
            aria-label="Open admin dashboard"
          >
            <LayoutDashboard size={14} />
            Dashboard
          </Link>
          <Link
            href="/admin"
            aria-label="Open admin dashboard"
            className="grid size-10 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink-900)] sm:hidden"
          >
            <LayoutDashboard size={18} />
          </Link>
          <button
            type="button"
            aria-label={isMobileNavOpen ? "Close menu" : "Open menu"}
            onClick={handleMobileNavToggle}
            className="grid size-10 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-700)] hover:bg-[var(--color-surface-muted)] lg:hidden"
          >
            {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <MobileNav isOpen={isMobileNavOpen} onLinkClick={handleMobileNavClose} />
    </header>
  );
}

function SupportStrip() {
  return (
    <div className="hidden border-b border-[var(--color-accent-800)] bg-[var(--color-accent-700)] text-white sm:block">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 text-xs sm:px-6 lg:px-8">
        <span className="flex items-center gap-2 text-[var(--color-accent-100)]">
          <MapPin size={11} className="text-[var(--color-saffron-300)]" />
          <span>Same-day delivery in Lahore · 15-day moneyback · 5% off bank transfer</span>
        </span>
        <div className="flex items-center gap-4">
          <a
            href={buildWhatsAppLink("Salam! I'd like to ask about a phone.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-white/85 hover:text-white"
          >
            <MessageCircle size={12} />
            <span>WhatsApp</span>
          </a>
          <Link
            href={`tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`}
            className="flex items-center gap-1.5 text-white/85 hover:text-white"
          >
            <Phone size={12} />
            <span>{SUPPORT_PHONE}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

interface IconButtonProps {
  ariaLabel: string;
  badgeCount?: number;
  children: React.ReactNode;
}

function IconButton({ ariaLabel, badgeCount, children }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="relative grid size-10 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink-900)]"
    >
      {children}
      {badgeCount && badgeCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-[var(--color-accent-500)] text-[10px] font-semibold text-white">
          {badgeCount}
        </span>
      )}
    </button>
  );
}

interface MobileNavProps {
  isOpen: boolean;
  onLinkClick: () => void;
}

function MobileNav({ isOpen, onLinkClick }: MobileNavProps) {
  return (
    <div
      className={classNames(
        "overflow-hidden border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)] transition-all duration-200 lg:hidden",
        isOpen ? "max-h-96" : "max-h-0",
      )}
    >
      <div className="flex flex-col gap-1 px-4 py-3 sm:px-6">
        <div className="md:hidden">
          <Input
            name="mobile-search"
            placeholder="Search phones…"
            leadingIcon={<Search size={16} />}
          />
        </div>
        {NAV_LINKS.map((navLink) => (
          <Link
            key={navLink.href}
            href={navLink.href}
            onClick={onLinkClick}
            className="rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-[var(--color-ink-800)] hover:bg-[var(--color-surface-muted)]"
          >
            {navLink.label}
          </Link>
        ))}
        <Button variant="primary" size="md" className="mt-2 w-full" onClick={onLinkClick}>
          Browse all phones
        </Button>
      </div>
    </div>
  );
}
