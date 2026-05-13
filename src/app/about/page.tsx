import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
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
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-12 lg:px-8">
      <Hero />
      <InspectionProcess />
      <GradesExplained />
      <BuyingProcessSection />
      <WarrantySection />
      <ContactSection />
    </div>
  );
}

function Hero() {
  return (
    <section className="space-y-3 sm:space-y-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-700)] sm:text-xs">
        About {SITE_NAME}
      </p>
      <h1 className="font-semibold text-balance text-3xl leading-[0.98] tracking-tight text-[var(--color-ink-900)] sm:text-5xl lg:text-6xl">
        Pre-owned phones,<br />
        <span className="italic text-[var(--color-accent-700)]">done properly.</span>
      </h1>
      <p className="max-w-3xl text-pretty text-[13px] text-[var(--color-ink-600)] sm:text-base lg:text-lg">
        We started {SITE_NAME} on Hall Road, Lahore — Pakistan&apos;s biggest mobile market — with
        a simple idea. Most Pakistanis don&apos;t need a brand-new phone, they need a working one
        at a fair price, with someone standing behind it. We&apos;re a sales-only store —{" "}
        <span className="font-semibold text-[var(--color-ink-800)]">we don&apos;t repair phones in-house</span>.
        Every unit we list passes a 32-point inspection, gets honestly graded A+ to C, and is
        clearly tagged by stock type so you know exactly what you&apos;re buying.
      </p>
    </section>
  );
}

function InspectionProcess() {
  const steps = [
    {
      number: "01",
      title: "Sourcing",
      body: "From authorised wholesalers, returns and verified Pakistani suppliers. Brand-new from official channels; refurbished stock comes already restored from suppliers, never reworked by us.",
    },
    {
      number: "02",
      title: "Diagnostics",
      body: "Every unit runs through a 32-point software and hardware test rig at our Hall Road lab. We don't fix what's broken — if it fails, we reject it.",
    },
    {
      number: "03",
      title: "Grading",
      body: "Two independent technicians assign a condition grade — A+ to C — based on cosmetics, screen, battery range and every button.",
    },
    {
      number: "04",
      title: "Stock-type tag",
      body: "On top of the grade, every unit gets a stock-type label — brand-new, genuine, box-open, refurbished, China water pack or LCD shaded — so what you see is what you get.",
    },
    {
      number: "05",
      title: "Packaging",
      body: "Brand-new and box-open units ship sealed with all original accessories. Genuine, refurb and others ship in original or generic packaging — we list whether a box is included on every product.",
    },
    {
      number: "06",
      title: "Video & dispatch",
      body: "We shoot a short video of your exact unit — IMEI, screen, body — share it on WhatsApp, and dispatch on your approval.",
    },
  ];

  return (
    <section className="mt-10 sm:mt-16">
      <h2 className="font-semibold text-2xl tracking-tight text-[var(--color-ink-900)] sm:text-4xl lg:text-5xl">
        Our 6-step process
      </h2>
      <p className="mt-1.5 max-w-2xl text-[13px] text-[var(--color-ink-600)] sm:mt-2 sm:text-base">
        From sourcing to delivery — here&apos;s exactly what every phone goes through before it
        reaches your doorstep.
      </p>
      <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <Card key={step.number} className="p-4 sm:p-5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--color-accent-700)] sm:text-xs">
              {step.number}
            </span>
            <h3 className="font-semibold mt-1 text-base leading-tight text-[var(--color-ink-900)] sm:text-xl">
              {step.title}
            </h3>
            <p className="mt-1.5 text-[13px] text-[var(--color-ink-600)] sm:text-sm">{step.body}</p>
          </Card>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-4 py-3.5 sm:mt-5 sm:px-5 sm:py-4">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--color-accent-700)] sm:size-[18px]" />
        <div>
          <p className="text-[13px] font-semibold text-[var(--color-ink-900)] sm:text-sm">
            We don&apos;t repair phones for resale
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-600)]">
            If a unit fails diagnostics, it&apos;s rejected — never patched up and put back on the
            shelf. After-sales service for genuine faults under warranty is a different thing,
            and we still take care of that.
          </p>
        </div>
      </div>
    </section>
  );
}

function GradesExplained() {
  return (
    <section
      id="grades"
      className="mt-10 rounded-[var(--radius-xl)] bg-[var(--color-ink-900)] p-5 text-[var(--color-canvas)] sm:mt-16 sm:p-8 lg:p-12"
    >
      <div className="grid gap-5 sm:gap-8 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-2.5 sm:space-y-3">
          <BadgeCheck size={22} className="text-[var(--color-accent-400)] sm:size-7" />
          <h2 className="font-semibold text-2xl tracking-tight sm:text-4xl lg:text-5xl">
            Four grades.<br />
            <span className="italic text-[var(--color-accent-300)]">No</span> grey areas.
          </h2>
          <p className="text-[13px] text-[var(--color-ink-300)] sm:text-base">
            We pick a grade and stick to it — no &quot;mostly excellent&quot;, no &quot;A-minus-ish&quot;.
            What you see is what shows up at your door.
          </p>
        </div>
        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
          {gradeDescriptors.map((descriptor) => (
            <div
              key={descriptor.grade}
              className="rounded-[var(--radius-lg)] border border-white/10 bg-white/5 p-4 sm:p-5"
            >
              <div className="flex items-center gap-2.5">
                <GradeBadge grade={descriptor.grade} size="md" />
                <span className="text-[13px] font-medium sm:text-sm">{descriptor.shortLabel}</span>
              </div>
              <p className="mt-2.5 text-[13px] text-[var(--color-canvas)] sm:mt-3 sm:text-sm">{descriptor.description}</p>
              <p className="mt-1.5 text-xs text-[var(--color-ink-300)] sm:mt-2">{descriptor.cosmeticNotes}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BuyingProcessSection() {
  const steps = [
    {
      label: "Confirm on WhatsApp",
      body: "Browse the site, then WhatsApp us to confirm stock and finalise the exact unit.",
    },
    {
      label: "Pay advance (or full bank transfer)",
      body: "Lock the unit with a small advance, or pay full by bank transfer for a flat 5% off.",
    },
    {
      label: "Video before dispatch",
      body: "We shoot a short video of your exact unit — IMEI, screen, body, included accessories — and send it on WhatsApp.",
    },
    {
      label: "Approve, we dispatch",
      body: "On your approval we dispatch via tracked courier. Same-day in Lahore, 1–3 days across Pakistan.",
    },
    {
      label: `${MONEYBACK_DAYS}-day moneyback after delivery`,
      body: `Change your mind for any reason within ${MONEYBACK_DAYS} days, return the unit unmodified, and we refund 100% by bank transfer within 48 hours.`,
    },
  ];

  return (
    <section
      id="how-to-buy"
      className="mt-10 grid gap-6 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5 sm:mt-16 sm:gap-8 sm:p-8 lg:grid-cols-2 lg:gap-14 lg:p-12"
    >
      <div className="space-y-2.5 sm:space-y-3">
        <Video size={22} className="text-[var(--color-accent-600)] sm:size-7" />
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--color-ink-900)] sm:text-4xl lg:text-5xl">
          How to order online
        </h2>
        <p className="text-[13px] text-[var(--color-ink-600)] sm:text-base">
          We&apos;re a sales-only store — no trade-ins, no buy-back. Every online order is locked
          with an advance, then we send a real video of your exact unit before dispatch. Walk into
          our Hall Road outlet to skip the video and verify in person instead.
        </p>
        <div className="mt-3 grid gap-2.5 sm:mt-4 sm:gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] p-2.5 sm:p-3">
            <Banknote size={16} className="mt-0.5 shrink-0 text-[var(--color-accent-700)] sm:size-[18px]" />
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-ink-900)] sm:text-sm">5% off on bank transfer</p>
              <p className="text-xs text-[var(--color-ink-600)]">Pay full upfront and save instantly.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] p-2.5 sm:p-3">
            <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--color-accent-700)] sm:size-[18px]" />
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-ink-900)] sm:text-sm">Verify in store</p>
              <p className="text-xs text-[var(--color-ink-600)]">Hall Road, Lahore — pay only when satisfied.</p>
            </div>
          </div>
        </div>
      </div>
      <ol className="space-y-3.5 text-[13px] sm:space-y-4 sm:text-sm">
        {steps.map((step, stepIndex) => (
          <li key={step.label} className="flex gap-3 sm:gap-4">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-accent-100)] text-[13px] font-semibold text-[var(--color-accent-800)] sm:size-8 sm:text-sm">
              {stepIndex + 1}
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

function WarrantySection() {
  return (
    <section
      id="warranty"
      className="mt-10 grid gap-5 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-5 sm:mt-16 sm:gap-6 sm:p-8 lg:grid-cols-[1fr_1.4fr] lg:p-12"
    >
      <div className="space-y-2.5 sm:space-y-3">
        <ShieldCheck size={22} className="text-[var(--color-accent-700)] sm:size-7" />
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--color-ink-900)] sm:text-4xl lg:text-5xl">
          15-day moneyback,<br />
          <span className="italic text-[var(--color-accent-700)]">life-long</span> service.
        </h2>
        <p className="text-[13px] text-[var(--color-ink-600)] sm:text-base">
          You get a {MONEYBACK_DAYS}-day moneyback guarantee on every order — change your mind,
          we refund. After that, your unit is covered for 3–6 months under warranty depending on
          the variant. And once warranty ends, we still service genuine faults at our Hall Road
          outlet (excluding physical or liquid damage).
        </p>
        <div className="mt-2.5 grid gap-2 text-[13px] sm:mt-3 sm:text-sm">
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-2.5 sm:p-3">
            <p className="font-semibold text-[var(--color-ink-900)]">Brand-new</p>
            <p className="text-xs text-[var(--color-ink-600)]">12-month company warranty.</p>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-2.5 sm:p-3">
            <p className="font-semibold text-[var(--color-ink-900)]">Genuine / box-open / refurbished</p>
            <p className="text-xs text-[var(--color-ink-600)]">6-month shop warranty.</p>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-2.5 sm:p-3">
            <p className="font-semibold text-[var(--color-ink-900)]">China water pack / LCD shaded</p>
            <p className="text-xs text-[var(--color-ink-600)]">3-month shop warranty.</p>
          </div>
        </div>
      </div>
      <ul className="grid gap-2.5 text-[13px] sm:gap-3 sm:text-sm sm:grid-cols-2">
        {[
          "Battery faults",
          "Charging port issues",
          "Speaker / microphone faults",
          "Display defects",
          "Camera failures",
          "Button or sensor failures",
        ].map((coverage) => (
          <li
            key={coverage}
            className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[var(--color-ink-700)] sm:px-4 sm:py-3"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-[var(--color-accent-500)]" />
            <span>{coverage}</span>
          </li>
        ))}
        <li className="rounded-[var(--radius-md)] bg-[var(--color-ink-900)] px-3.5 py-2.5 text-xs text-[var(--color-canvas)] sm:col-span-2 sm:px-4 sm:py-3">
          <span className="font-semibold">Not covered:</span> physical damage, liquid ingress,
          screen cracks from drops, unauthorised repairs.
        </li>
      </ul>
    </section>
  );
}

function ContactSection() {
  const contacts = [
    {
      icon: <MessageCircle size={18} />,
      label: "WhatsApp",
      value: "Chat with us",
      href: buildWhatsAppLink("Salam! I have a question."),
    },
    {
      icon: <Phone size={18} />,
      label: "Call",
      value: SUPPORT_PHONE,
      href: `tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`,
    },
    {
      icon: <Mail size={18} />,
      label: "Email",
      value: SUPPORT_EMAIL,
      href: `mailto:${SUPPORT_EMAIL}`,
    },
    {
      icon: <MapPin size={18} />,
      label: "Visit",
      value: "Arif Centre, Hall Road, Lahore",
      href: "https://maps.app.goo.gl/xzQQDXBdV6R4JXP98",
    },
  ];
  return (
    <section id="contact" className="mt-10 sm:mt-16">
      <h2 className="font-semibold text-2xl tracking-tight text-[var(--color-ink-900)] sm:text-4xl lg:text-5xl">
        Get in touch
      </h2>
      <p className="mt-1.5 text-[13px] text-[var(--color-ink-600)] sm:mt-2 sm:text-base">
        Open Mon–Sat, 11:00 — 21:00. Closed Friday afternoon for prayer.
      </p>
      <div className="mt-5 grid gap-2.5 sm:mt-6 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {contacts.map((contact) => {
          const inner = (
            <Card className="flex h-full items-start gap-3 p-4 sm:p-5">
              <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)] sm:size-10">
                {contact.icon}
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)] sm:text-xs">
                  {contact.label}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-[var(--color-ink-900)] sm:text-sm">
                  {contact.value}
                </p>
              </div>
            </Card>
          );
          if (!contact.href) {
            return <div key={contact.label}>{inner}</div>;
          }
          return (
            <a
              key={contact.label}
              href={contact.href}
              target={contact.href.startsWith("http") ? "_blank" : undefined}
              rel={contact.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="block transition-transform hover:-translate-y-0.5"
            >
              {inner}
            </a>
          );
        })}
      </div>

      <div className="mt-7 grid gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-6">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-700)] sm:text-xs">
            Payment we accept
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-[13px] sm:mt-4 sm:text-sm">
            {PAYMENT_METHODS.map((paymentMethod) => (
              <li
                key={paymentMethod.id}
                className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-2.5 py-2 sm:px-3 sm:py-2.5"
              >
                <p className="font-semibold text-[var(--color-ink-900)]">{paymentMethod.label}</p>
                <p className="text-xs text-[var(--color-ink-500)]">{paymentMethod.note}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4 sm:p-6">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-700)] sm:text-xs">
            Delivering to
          </h3>
          <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4">
            {SERVICE_CITIES.map((cityName) => (
              <span
                key={cityName}
                className="rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink-700)] sm:px-3 sm:py-1.5 sm:text-xs"
              >
                {cityName}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-[var(--color-ink-500)] sm:mt-4 sm:text-sm">
            Delivery 1–3 days · Same-day in Lahore for orders before 2 PM.{" "}
            <ArrowRight size={12} className="inline" />
          </p>
        </Card>
      </div>
    </section>
  );
}
