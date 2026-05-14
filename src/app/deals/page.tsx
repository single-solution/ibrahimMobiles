import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { OfferCard } from "@/components/shared/OfferCard";
import { PhoneCard } from "@/components/shared/PhoneCard";
import { offers } from "@/data/offers";
import { getPhonesOnOffer } from "@/data/phones";
import { formatRelativeDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Today's deals",
  description: "Live offers, weekly drops and bank-transfer discounts on pre-owned phones.",
};

export default function DealsPage() {
  const offeredPhones = getPhonesOnOffer();

  return (
    <>
      {/* Mobile only — native */}
      <div className="app-page pb-6 pt-3 md:hidden">
        <section className="app-section flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-100)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-800)]">
            <Sparkles size={11} />
            Live offers
          </span>
          <h1 className="mt-3 text-[26px] font-semibold leading-[1.05] tracking-tight text-[var(--color-ink-900)]">
            Today&apos;s deals
          </h1>
          <p className="mt-2.5 text-[13.5px] leading-snug text-[var(--color-ink-600)]">
            Weekly drops, bundle deals and a flat 5% off on full bank transfer.
          </p>
        </section>

        <section className="app-section">
          <div className="app-section-eyebrow">
            <span>Active offers</span>
          </div>
          <ul className="app-list">
            {offers.map((offer) => (
              <li key={offer.id} id={offer.slug}>
                <Link
                  href={`/deals#${offer.slug}`}
                  className="app-list-row"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold uppercase text-white"
                    style={{ backgroundColor: ACCENT_BG[offer.accentColor] }}
                  >
                    {offer.discountLabel.split(" ")[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[13.5px] font-semibold leading-tight text-[var(--color-ink-900)]">
                      {offer.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-500)]">
                      <Clock size={11} />
                      {formatRelativeDate(offer.expiresAt)}
                    </p>
                  </div>
                  <ArrowRight size={13} className="shrink-0 text-[var(--color-ink-400)]" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="app-section">
          <div className="app-section-eyebrow">
            <span>Phones on sale</span>
            <span className="lowercase tracking-normal text-[var(--color-ink-500)]">
              {offeredPhones.length} phones
            </span>
          </div>
          <p className="mb-3 text-center text-[12.5px] leading-snug text-[var(--color-ink-500)]">
            {offeredPhones.length} devices with an active offer right now.
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
            {offeredPhones.map((offeredPhone) => (
              <PhoneCard key={offeredPhone.id} phone={offeredPhone} />
            ))}
          </div>
        </section>
      </div>

      {/* Desktop — single layout */}
      <div className="mx-auto hidden max-w-7xl px-6 py-12 md:block">
        <header className="space-y-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            <Sparkles size={12} />
            Live offers
          </p>
          <h1 className="text-5xl font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)]">
            Today&apos;s deals
          </h1>
          <p className="max-w-2xl text-base text-[var(--color-ink-600)]">
            Weekly drops, bundle deals and a flat 5% off on full bank transfer.
          </p>
        </header>

        <section className="mt-16 grid grid-cols-2 gap-4">
          {offers.map((offer) => (
            <div key={offer.id} id={offer.slug}>
              <OfferCard offer={offer} size="lg" />
            </div>
          ))}
        </section>

        <section className="mt-20 space-y-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-4xl font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
                Phones on sale
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-500)]">
                {offeredPhones.length} devices with an active offer.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-5">
            {offeredPhones.map((offeredPhone) => (
              <PhoneCard key={offeredPhone.id} phone={offeredPhone} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

const ACCENT_BG: Record<string, string> = {
  emerald: "#0f766e",
  amber: "#ea580c",
  rose: "#e11d48",
  sky: "#0f172a",
};
