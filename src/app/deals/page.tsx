import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { OfferCard } from "@/components/shared/OfferCard";
import { PhoneCard } from "@/components/shared/PhoneCard";
import { offers } from "@/data/offers";
import { getPhonesOnOffer } from "@/data/phones";

export const metadata: Metadata = {
  title: "Today's deals",
  description: "Live offers, weekly drops and bank-transfer discounts on pre-owned phones.",
};

export default function DealsPage() {
  const offeredPhones = getPhonesOnOffer();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="space-y-2.5 sm:space-y-3">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-700)] sm:text-xs">
          <Sparkles size={12} />
          Live offers
        </p>
        <h1 className="font-semibold text-3xl leading-[0.98] tracking-tight text-[var(--color-ink-900)] sm:text-5xl lg:text-6xl">
          Today&apos;s <span className="italic text-[var(--color-accent-700)]">deals</span>
        </h1>
        <p className="max-w-2xl text-[13px] text-[var(--color-ink-600)] sm:text-base">
          Weekly drops, bundle deals and a flat 5% off when you pay full by bank transfer.
          Refreshed every Friday — grab them before they&apos;re gone.
        </p>
      </header>

      <section className="mt-6 grid gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-2">
        {offers.map((offer) => (
          <div key={offer.id} id={offer.slug}>
            <OfferCard offer={offer} size="lg" />
          </div>
        ))}
      </section>

      <section className="mt-10 space-y-4 sm:mt-16 sm:space-y-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-2xl tracking-tight text-[var(--color-ink-900)] sm:text-4xl lg:text-5xl">
              Phones on sale right now
            </h2>
            <p className="mt-1 text-xs text-[var(--color-ink-500)] sm:text-sm">
              {offeredPhones.length} devices with an active offer applied.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {offeredPhones.map((offeredPhone) => (
            <PhoneCard key={offeredPhone.id} phone={offeredPhone} />
          ))}
        </div>
      </section>
    </div>
  );
}
