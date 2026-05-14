import type { Metadata } from "next";
import {
  BadgeCheck,
  Banknote,
  ChevronRight,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Video,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { gradeDescriptors } from "@/data/grades";
import {
  MONEYBACK_DAYS,
  PAYMENT_METHODS,
  SERVICE_CITIES,
  SITE_NAME,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  buildWhatsAppLink,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description: `How ${SITE_NAME} sources, grades, categorises and warranties every pre-owned phone we sell across Pakistan.`,
};

export default function AboutPage() {
  return (
    <>
      {/* Mobile only — native */}
      <div className="app-page pb-6 pt-3 md:hidden">
        <MobileHero />
        <MobileInspectionSection />
        <MobileGradesSection />
        <MobileBuyingSection />
        <MobileWarrantySection />
        <MobileContactSection />
      </div>

      {/* Desktop — single layout */}
      <div className="mx-auto hidden max-w-5xl px-6 py-12 md:block">
        <DesktopHero />
        <DesktopInspection />
        <DesktopGradesExplained />
        <DesktopBuyingProcess />
        <DesktopWarranty />
        <DesktopContact />
      </div>
    </>
  );
}

/* ─────────────────────────── Mobile ─────────────────────────── */

function MobileHero() {
  return (
    <section className="app-section flex flex-col items-center text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-100)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-800)]">
        About {SITE_NAME}
      </span>
      <h1 className="mt-3 text-[26px] font-semibold leading-[1.05] tracking-tight text-[var(--color-ink-900)]">
        Pre-owned phones,<br />
        <span className="text-[var(--color-accent-700)]">done properly.</span>
      </h1>
      <p className="mt-2.5 text-[13.5px] leading-snug text-[var(--color-ink-600)]">
        We started {SITE_NAME} on Hall Road, Lahore — Pakistan&apos;s biggest mobile market.
        Sales-only — <span className="font-semibold text-[var(--color-ink-800)]">we don&apos;t repair phones in-house.</span> Every unit passes a 32-point inspection, gets honestly graded A+ to C, and is clearly tagged by stock type.
      </p>
    </section>
  );
}

function MobileInspectionSection() {
  const steps = [
    { num: 1, title: "Sourcing", body: "Authorised wholesalers and verified suppliers." },
    { num: 2, title: "Diagnostics", body: "32-point software + hardware test rig." },
    { num: 3, title: "Grading", body: "Two technicians assign A+ to C." },
    { num: 4, title: "Stock-type tag", body: "Brand-new, genuine, refurbished, box-open, etc." },
    { num: 5, title: "Packaging", body: "Sealed when applicable, original or generic otherwise." },
    { num: 6, title: "Video & dispatch", body: "Video on WhatsApp, dispatch on your approval." },
  ];
  return (
    <section className="app-section">
      <div className="app-section-eyebrow">
        <span>Our 6-step process</span>
      </div>
      <p className="mb-3 text-center text-[12.5px] leading-snug text-[var(--color-ink-500)]">
        From sourcing to delivery — every phone goes through this before it reaches you.
      </p>
      <ol className="app-list">
        {steps.map((step) => (
          <li key={step.num} className="app-list-row">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-accent-100)] text-[12px] font-semibold text-[var(--color-accent-800)]">
              {step.num}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-tight text-[var(--color-ink-900)]">
                {step.title}
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-ink-500)]">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-2 flex items-start gap-2 rounded-[12px] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-3 py-2.5">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[var(--color-accent-700)]" />
        <p className="text-[12px] leading-snug text-[var(--color-ink-700)]">
          <span className="font-semibold text-[var(--color-ink-900)]">We don&apos;t repair phones for resale.</span>{" "}
          If a unit fails diagnostics, it&apos;s rejected.
        </p>
      </div>
    </section>
  );
}

function MobileGradesSection() {
  return (
    <section id="grades" className="app-section">
      <div className="app-section-eyebrow">
        <span>Four grades. No grey areas.</span>
      </div>
      <p className="mb-3 text-center text-[12.5px] leading-snug text-[var(--color-ink-500)]">
        We pick a grade and stick to it — no &quot;mostly excellent&quot;, no &quot;A-minus-ish&quot;.
      </p>
      <ul className="app-list">
        {gradeDescriptors.map((descriptor) => (
          <li key={descriptor.grade} className="app-list-row">
            <GradeBadge grade={descriptor.grade} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-tight text-[var(--color-ink-900)]">
                {descriptor.shortLabel}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[var(--color-ink-500)]">
                {descriptor.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MobileBuyingSection() {
  const steps = [
    { label: "Confirm on WhatsApp", body: "Browse, then WhatsApp us to lock the unit." },
    { label: "Pay advance or full", body: "Bank transfer full = 5% off." },
    { label: "Video before dispatch", body: "Short video — IMEI, screen, body — on WhatsApp." },
    { label: "Approve, we dispatch", body: "Same-day Lahore, 1–3 days nationwide." },
    { label: `${MONEYBACK_DAYS}-day moneyback`, body: "100% refund within 48 hours of return." },
  ];
  return (
    <section id="how-to-buy" className="app-section">
      <div className="app-section-eyebrow">
        <span>How to order online</span>
      </div>
      <p className="mb-3 text-center text-[12.5px] leading-snug text-[var(--color-ink-500)]">
        Sales-only. Every order is locked with an advance, then a video of your exact unit before dispatch.
      </p>
      <ol className="app-list">
        {steps.map((step, idx) => (
          <li key={step.label} className="app-list-row">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-accent-100)] text-[12px] font-semibold text-[var(--color-accent-800)]">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-tight text-[var(--color-ink-900)]">
                {step.label}
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-ink-500)]">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MobileWarrantySection() {
  const tiers = [
    { label: "Brand-new", body: "12-month company warranty." },
    { label: "Genuine / box-open / refurbished", body: "6-month shop warranty." },
    { label: "China water pack / LCD shaded", body: "3-month shop warranty." },
  ];
  const covered = [
    "Battery faults",
    "Charging port issues",
    "Speaker / mic faults",
    "Display defects",
    "Camera failures",
    "Buttons / sensors",
  ];
  return (
    <section id="warranty" className="app-section">
      <div className="app-section-eyebrow">
        <span>15-day moneyback, life-long service</span>
      </div>
      <p className="mb-3 text-center text-[12.5px] leading-snug text-[var(--color-ink-500)]">
        After {MONEYBACK_DAYS} days you&apos;re on warranty (3–6 months by variant). Even after that, we still service genuine faults at Hall Road.
      </p>
      <ul className="app-list">
        {tiers.map((tier) => (
          <li key={tier.label} className="app-list-row">
            <ShieldCheck size={16} className="shrink-0 text-[var(--color-accent-700)]" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-tight text-[var(--color-ink-900)]">
                {tier.label}
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-ink-500)]">
                {tier.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        Covered
      </p>
      <ul className="mt-1.5 grid grid-cols-2 gap-1.5">
        {covered.map((item) => (
          <li
            key={item}
            className="flex items-center gap-1.5 rounded-[10px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-2 py-1.5 text-[12px] text-[var(--color-ink-700)]"
          >
            <span className="size-1 shrink-0 rounded-full bg-[var(--color-accent-500)]" />
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-2.5 rounded-[10px] bg-[var(--color-ink-900)] px-3 py-2 text-[11.5px] text-[var(--color-canvas)]">
        <span className="font-semibold">Not covered:</span> physical damage, liquid ingress, screen cracks, unauthorised repairs.
      </p>
    </section>
  );
}

function MobileContactSection() {
  const contacts = [
    {
      icon: <MessageCircle size={16} />,
      label: "WhatsApp",
      value: "Chat with us",
      href: buildWhatsAppLink("Salam! I have a question."),
    },
    { icon: <Phone size={16} />, label: "Call", value: SUPPORT_PHONE, href: `tel:${SUPPORT_PHONE.replace(/\s+/g, "")}` },
    { icon: <Mail size={16} />, label: "Email", value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
    { icon: <MapPin size={16} />, label: "Visit", value: "Hall Road, Lahore", href: "https://maps.app.goo.gl/xzQQDXBdV6R4JXP98" },
  ];
  return (
    <section id="contact" className="app-section">
      <div className="app-section-eyebrow">
        <span>Get in touch</span>
      </div>
      <p className="mb-3 text-center text-[12.5px] leading-snug text-[var(--color-ink-500)]">
        Open Mon–Sat, 11:00 — 21:00. Closed Friday afternoon for prayer.
      </p>
      <ul className="app-list">
        {contacts.map((contact) => (
          <li key={contact.label}>
            <a
              href={contact.href}
              target={contact.href.startsWith("http") ? "_blank" : undefined}
              rel={contact.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="app-list-row"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
                {contact.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                  {contact.label}
                </p>
                <p className="mt-0.5 text-[13.5px] font-semibold leading-tight text-[var(--color-ink-900)]">
                  {contact.value}
                </p>
              </div>
              <ChevronRight size={14} className="shrink-0 text-[var(--color-ink-400)]" />
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        Payment we accept
      </div>
      <ul className="mt-1.5 grid grid-cols-2 gap-1.5">
        {PAYMENT_METHODS.map((paymentMethod) => (
          <li
            key={paymentMethod.id}
            className="rounded-[10px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-2 py-1.5"
          >
            <p className="text-[12px] font-semibold leading-tight text-[var(--color-ink-900)]">{paymentMethod.label}</p>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--color-ink-500)]">{paymentMethod.note}</p>
          </li>
        ))}
      </ul>

      <div className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        Delivering to
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {SERVICE_CITIES.map((cityName) => (
          <span
            key={cityName}
            className="rounded-full border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] text-[var(--color-ink-700)]"
          >
            {cityName}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11.5px] text-[var(--color-ink-500)]">
        1–3 day delivery · Same-day in Lahore.
      </p>
    </section>
  );
}

/* ─────────────────────────── Desktop (preserved) ─────────────────────────── */

function DesktopHero() {
  return (
    <section className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
        About {SITE_NAME}
      </p>
      <h1 className="text-5xl font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)]">
        Pre-owned phones, done properly.
      </h1>
      <p className="max-w-3xl text-base leading-relaxed text-[var(--color-ink-600)]">
        We started {SITE_NAME} on Hall Road, Lahore — Pakistan&apos;s biggest mobile market.
        Sales-only — <span className="font-semibold text-[var(--color-ink-800)]">we don&apos;t repair phones in-house</span>.
        Every unit passes a 32-point inspection, gets honestly graded A+ to C, and is clearly
        tagged by stock type.
      </p>
    </section>
  );
}

function DesktopInspection() {
  const steps = [
    { number: "01", title: "Sourcing", body: "From authorised wholesalers, returns and verified Pakistani suppliers. Brand-new from official channels; refurbished stock comes already restored from suppliers, never reworked by us." },
    { number: "02", title: "Diagnostics", body: "Every unit runs through a 32-point software and hardware test rig at our Hall Road lab. We don't fix what's broken — if it fails, we reject it." },
    { number: "03", title: "Grading", body: "Two independent technicians assign a condition grade — A+ to C — based on cosmetics, screen, battery range and every button." },
    { number: "04", title: "Stock-type tag", body: "On top of the grade, every unit gets a stock-type label — brand-new, genuine, box-open, refurbished, China water pack or LCD shaded — so what you see is what you get." },
    { number: "05", title: "Packaging", body: "Brand-new and box-open units ship sealed with all original accessories. Genuine, refurb and others ship in original or generic packaging — we list whether a box is included on every product." },
    { number: "06", title: "Video & dispatch", body: "We shoot a short video of your exact unit — IMEI, screen, body — share it on WhatsApp, and dispatch on your approval." },
  ];
  return (
    <section className="mt-20">
      <h2 className="text-4xl font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
        Our 6-step process
      </h2>
      <p className="mt-2 max-w-2xl text-base text-[var(--color-ink-600)]">
        From sourcing to delivery — every phone goes through this before it reaches you.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-4">
        {steps.map((step) => (
          <Card key={step.number} className="p-5">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-700)]">{step.number}</span>
            <h3 className="mt-1 text-xl font-semibold leading-tight text-[var(--color-ink-900)]">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-600)]">{step.body}</p>
          </Card>
        ))}
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-5 py-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--color-accent-700)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink-900)]">We don&apos;t repair phones for resale</p>
          <p className="mt-0.5 text-[13px] text-[var(--color-ink-600)]">If a unit fails diagnostics, it&apos;s rejected — never patched up and put back on the shelf.</p>
        </div>
      </div>
    </section>
  );
}

function DesktopGradesExplained() {
  return (
    <section id="grades" className="mt-20 rounded-[var(--radius-xl)] bg-[var(--color-ink-900)] p-10 text-[var(--color-canvas)]">
      <div className="grid grid-cols-[1fr_2fr] gap-8">
        <div className="space-y-3">
          <BadgeCheck size={28} className="text-[var(--color-accent-400)]" />
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Four grades. No grey areas.
          </h2>
          <p className="text-base text-[var(--color-ink-300)]">
            We pick a grade and stick to it — no &quot;mostly excellent&quot;, no &quot;A-minus-ish&quot;.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {gradeDescriptors.map((descriptor) => (
            <div key={descriptor.grade} className="rounded-[var(--radius-lg)] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-2">
                <GradeBadge grade={descriptor.grade} size="sm" />
                <span className="line-clamp-1 text-sm font-medium">{descriptor.shortLabel}</span>
              </div>
              <p className="mt-3 text-sm leading-snug text-[var(--color-canvas)]">{descriptor.description}</p>
              <p className="mt-2 text-xs text-[var(--color-ink-300)]">{descriptor.cosmeticNotes}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DesktopBuyingProcess() {
  const steps = [
    { label: "Confirm on WhatsApp", body: "Browse the site, then WhatsApp us to confirm stock and finalise the exact unit." },
    { label: "Pay advance (or full bank transfer)", body: "Lock the unit with a small advance, or pay full by bank transfer for a flat 5% off." },
    { label: "Video before dispatch", body: "We shoot a short video of your exact unit — IMEI, screen, body, included accessories — and send it on WhatsApp." },
    { label: "Approve, we dispatch", body: "On your approval we dispatch via tracked courier. Same-day in Lahore, 1–3 days across Pakistan." },
    { label: `${MONEYBACK_DAYS}-day moneyback after delivery`, body: `Change your mind for any reason within ${MONEYBACK_DAYS} days, return the unit unmodified, and we refund 100% by bank transfer within 48 hours.` },
  ];
  return (
    <section id="how-to-buy" className="mt-20 grid grid-cols-2 gap-12 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-10">
      <div className="space-y-3">
        <Video size={28} className="text-[var(--color-accent-600)]" />
        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
          How to order online
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink-600)]">
          Sales-only store. Every order is locked with an advance, then we send a video of your exact unit before dispatch.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] p-3">
            <Banknote size={18} className="mt-0.5 shrink-0 text-[var(--color-accent-700)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink-900)]">5% off on bank transfer</p>
              <p className="text-[13px] text-[var(--color-ink-600)]">Pay full upfront and save.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] p-3">
            <MapPin size={18} className="mt-0.5 shrink-0 text-[var(--color-accent-700)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink-900)]">Verify in store</p>
              <p className="text-[13px] text-[var(--color-ink-600)]">Hall Road, pay when satisfied.</p>
            </div>
          </div>
        </div>
      </div>
      <ol className="space-y-4 text-sm">
        {steps.map((step, idx) => (
          <li key={step.label} className="flex gap-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-accent-100)] text-sm font-semibold text-[var(--color-accent-800)]">
              {idx + 1}
            </span>
            <div>
              <p className="font-semibold text-[var(--color-ink-900)]">{step.label}</p>
              <p className="text-[var(--color-ink-600)]">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DesktopWarranty() {
  return (
    <section id="warranty" className="mt-20 grid grid-cols-[1fr_1.4fr] gap-6 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-10">
      <div className="space-y-3">
        <ShieldCheck size={28} className="text-[var(--color-accent-700)]" />
        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
          15-day moneyback, life-long service.
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink-600)]">
          {MONEYBACK_DAYS}-day moneyback on every order. After that, 3–6 month warranty depending on variant. Even after warranty, we still service genuine faults at Hall Road.
        </p>
        <div className="mt-3 grid gap-2 text-sm">
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3">
            <p className="font-semibold text-[var(--color-ink-900)]">Brand-new</p>
            <p className="text-[13px] text-[var(--color-ink-600)]">12-month company warranty.</p>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3">
            <p className="font-semibold text-[var(--color-ink-900)]">Genuine / box-open / refurbished</p>
            <p className="text-[13px] text-[var(--color-ink-600)]">6-month shop warranty.</p>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3">
            <p className="font-semibold text-[var(--color-ink-900)]">China water pack / LCD shaded</p>
            <p className="text-[13px] text-[var(--color-ink-600)]">3-month shop warranty.</p>
          </div>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-3 text-sm">
        {[
          "Battery faults",
          "Charging port issues",
          "Speaker / microphone faults",
          "Display defects",
          "Camera failures",
          "Button or sensor failures",
        ].map((coverage) => (
          <li key={coverage} className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-ink-700)]">
            <span className="size-1.5 shrink-0 rounded-full bg-[var(--color-accent-500)]" />
            <span>{coverage}</span>
          </li>
        ))}
        <li className="col-span-2 rounded-[var(--radius-md)] bg-[var(--color-ink-900)] px-4 py-3 text-xs text-[var(--color-canvas)]">
          <span className="font-semibold">Not covered:</span> physical damage, liquid ingress, screen cracks from drops, unauthorised repairs.
        </li>
      </ul>
    </section>
  );
}

function DesktopContact() {
  const contacts = [
    { icon: <MessageCircle size={18} />, label: "WhatsApp", value: "Chat with us", href: buildWhatsAppLink("Salam! I have a question.") },
    { icon: <Phone size={18} />, label: "Call", value: SUPPORT_PHONE, href: `tel:${SUPPORT_PHONE.replace(/\s+/g, "")}` },
    { icon: <Mail size={18} />, label: "Email", value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
    { icon: <MapPin size={18} />, label: "Visit", value: "Arif Centre, Hall Road, Lahore", href: "https://maps.app.goo.gl/xzQQDXBdV6R4JXP98" },
  ];
  return (
    <section id="contact" className="mt-20">
      <h2 className="text-4xl font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
        Get in touch
      </h2>
      <p className="mt-2 text-base text-[var(--color-ink-600)]">
        Open Mon–Sat, 11:00 — 21:00. Closed Friday afternoon for prayer.
      </p>
      <div className="mt-6 grid grid-cols-4 gap-3">
        {contacts.map((contact) => (
          <a
            key={contact.label}
            href={contact.href}
            target={contact.href.startsWith("http") ? "_blank" : undefined}
            rel={contact.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="block transition-transform hover:-translate-y-0.5"
          >
            <Card className="flex h-full items-start gap-3 p-5">
              <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
                {contact.icon}
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--color-ink-500)]">{contact.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--color-ink-900)]">{contact.value}</p>
              </div>
            </Card>
          </a>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            Payment we accept
          </h3>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {PAYMENT_METHODS.map((paymentMethod) => (
              <li key={paymentMethod.id} className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-3 py-2.5">
                <p className="font-semibold text-[var(--color-ink-900)]">{paymentMethod.label}</p>
                <p className="text-xs text-[var(--color-ink-500)]">{paymentMethod.note}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            Delivering to
          </h3>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {SERVICE_CITIES.map((cityName) => (
              <span key={cityName} className="rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)]">
                {cityName}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-[var(--color-ink-500)]">
            1–3 day delivery · Same-day in Lahore.
          </p>
        </Card>
      </div>
    </section>
  );
}
