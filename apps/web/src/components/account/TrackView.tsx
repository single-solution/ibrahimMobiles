"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildWhatsAppLink,
  classNames,
  formatStorefrontDate,
  formatStorefrontDateTime,
} from "@store/shared";
import {
  ArrowUpRight,
  Check,
  MessageCircle,
  Package,
  Phone,
  Search,
  Truck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

import type {
  StorefrontOrder,
  StorefrontOrderTimelineEntry,
} from "@/lib/storefront/orderSerializer";
import type { OrderStatus } from "@store/db";

type Status = "idle" | "searching" | "not-found" | "found";

const STATUS_TONE: Record<
  OrderStatus,
  { toneBg: string; toneFg: string; toneDot: string; nextLabel?: string }
> = {
  "pending-payment": {
    toneBg: "bg-amber-50",
    toneFg: "text-amber-800",
    toneDot: "bg-amber-500",
    nextLabel: "Awaiting payment confirmation",
  },
  confirmed: {
    toneBg: "bg-sky-50",
    toneFg: "text-sky-800",
    toneDot: "bg-sky-500",
    nextLabel: "Packing your order",
  },
  dispatched: {
    toneBg: "bg-[var(--color-accent-100)]",
    toneFg: "text-[var(--color-accent-800)]",
    toneDot: "bg-[var(--color-accent-600)]",
    nextLabel: "Out for delivery",
  },
  delivered: {
    toneBg: "bg-emerald-50",
    toneFg: "text-emerald-800",
    toneDot: "bg-emerald-500",
  },
  cancelled: {
    toneBg: "bg-rose-50",
    toneFg: "text-rose-800",
    toneDot: "bg-rose-500",
  },
  refunded: {
    toneBg: "bg-rose-50",
    toneFg: "text-rose-800",
    toneDot: "bg-rose-500",
  },
};


export function TrackView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { whatsappNumber } = useStoreSettings();
  const [orderInput, setOrderInput] = useState(
    searchParams?.get("orderNumber") ?? "",
  );
  const [phoneInput, setPhoneInput] = useState(searchParams?.get("phone") ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [order, setOrder] = useState<StorefrontOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastLookupRef = useRef<string | null>(null);

  const trigger = async (orderNumber: string, phoneNumber: string) => {
    const key = `${orderNumber}|${phoneNumber}`;
    if (lastLookupRef.current === key) {
      return;
    }
    lastLookupRef.current = key;
    setStatus("searching");
    setOrder(null);
    setErrorMessage(null);
    try {
      const response = await fetch(
        `/api/storefront/order-status?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phoneNumber)}`,
        { headers: { Accept: "application/json" } },
      );
      const data = (await response.json()) as { found: boolean; order?: StorefrontOrder; error?: string };
      if (!response.ok && data.error) {
        setErrorMessage(data.error);
        setStatus("not-found");
        return;
      }
      if (data.found && data.order) {
        setOrder(data.order);
        setStatus("found");
      } else {
        setStatus("not-found");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("not-found");
    }
  };

  // Auto-trigger when query string is prefilled (e.g. linked from confirmation).
  // We deliberately run only on first mount; later changes to searchParams
  // are driven by user input through the form, which already calls trigger.
  // Including `searchParams` or `trigger` here would either re-fire mid-typing
  // or refire whenever React re-creates the closure.
  useEffect(() => {
    const orderNumber = (searchParams?.get("orderNumber") ?? "").trim();
    const phoneNumber = (searchParams?.get("phone") ?? "").trim();
    if (orderNumber && phoneNumber) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot prefill from URL on mount
      void trigger(orderNumber, phoneNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrack = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const orderNumber = orderInput.trim();
    const phoneNumber = phoneInput.trim();
    if (!orderNumber || !phoneNumber) {
      return;
    }
    const params = new URLSearchParams();
    params.set("orderNumber", orderNumber);
    params.set("phone", phoneNumber);
    router.replace(`/track?${params.toString()}`, { scroll: false });
    void trigger(orderNumber, phoneNumber);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:px-6 md:pb-16 md:pt-12 lg:px-8">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
          Track without signing in
        </p>
        <h1 className="mt-2 font-headline text-[36px] font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)] md:text-[52px]">
          Where&rsquo;s my phone?
        </h1>
        <p className="mt-2 text-[13px] text-[var(--color-ink-500)] md:text-sm">
          Enter your order number and the phone you used at checkout.
        </p>
      </div>

      <Card className="mt-6 p-4 md:mt-8 md:p-6">
        <form onSubmit={handleTrack} className="space-y-3">
          <Field
            label="Order number"
            value={orderInput}
            onChange={setOrderInput}
            placeholder="e.g. IM-2026-1024"
            icon={<Package size={14} />}
          />
          <Field
            label="Phone used at checkout"
            value={phoneInput}
            onChange={setPhoneInput}
            placeholder="+92 320 4862403"
            icon={<Phone size={14} />}
            inputMode="tel"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="cta-arrow w-full"
            isLoading={status === "searching"}
            trailingIcon={status !== "searching" ? <Search size={14} /> : undefined}
            disabled={!orderInput.trim() || !phoneInput.trim()}
          >
            {status === "searching" ? "Looking up your order…" : "Track order"}
          </Button>
        </form>

        {status === "not-found" && (
          <div className="mt-4 rounded-[var(--radius-md)] border border-rose-100 bg-rose-50 p-3 text-[12.5px] text-rose-800">
            {errorMessage ?? (
              <>
                We couldn&rsquo;t find an order with that number and phone. Try the format{" "}
                <span className="font-mono">IM-2026-XXXX</span> from your confirmation, or{" "}
                <a
                  href={buildWhatsAppLink("Salam! I can't find my order.", whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline font-semibold"
                >
                  chat with us on WhatsApp
                </a>
                .
              </>
            )}
          </div>
        )}
      </Card>

      {status === "found" && order && <FoundOrder order={order} />}
      {status === "idle" && <Hints />}
    </div>
  );
}

function Hints() {
  return (
    <Card className="mt-4 p-4 text-[12.5px] text-[var(--color-ink-600)] md:mt-6 md:p-5">
      <p className="font-semibold text-[var(--color-ink-900)]">Tip</p>
      <p className="mt-1">
        Already signed in?{" "}
        <Link
          href="/account/orders"
          className="link-underline font-semibold text-[var(--color-accent-700)]"
        >
          Open your order history
        </Link>{" "}
        for full timeline, items and totals.
      </p>
    </Card>
  );
}

interface FoundOrderProps {
  order: StorefrontOrder;
}

function FoundOrder({ order }: FoundOrderProps) {
  const tone = STATUS_TONE[order.status];
  const { supportPhone, whatsappNumber } = useStoreSettings();
  return (
    <Card className="reveal mt-4 overflow-hidden md:mt-6">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-4 py-3 md:px-5">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-800)]">
            <Truck size={15} />
          </span>
          <div>
            <p className="font-mono text-[14px] font-semibold text-[var(--color-ink-900)]">
              {order.orderNumber}
            </p>
            <p className="text-[11.5px] text-[var(--color-ink-500)]">
              Placed {formatStorefrontDate(order.placedAt)}
            </p>
          </div>
        </div>
        <span
          className={classNames(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
            tone.toneBg,
            tone.toneFg,
          )}
        >
          <span className={classNames("size-1.5 rounded-full", tone.toneDot)} />
          {order.statusLabel}
        </span>
      </div>
      {order.timeline.length > 0 ? (
        <ol className="space-y-4 p-4 md:p-5">
          {order.timeline.map((entry, index) => (
            <TimelineRow
              key={`${entry.status}-${index}`}
              entry={entry}
              isLast={index === order.timeline.length - 1}
              isCurrent={
                index === order.timeline.length - 1 && order.status !== "delivered"
              }
            />
          ))}
        </ol>
      ) : (
        <p className="px-4 py-5 text-[12.5px] text-[var(--color-ink-500)] md:px-5">
          We&rsquo;ll post timeline updates here as your order moves.
        </p>
      )}

      <div className="border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/40 p-4 md:flex md:items-center md:justify-between md:p-5">
        <p className="text-[12.5px] text-[var(--color-ink-600)]">
          {tone.nextLabel ?? "Need updates? We post on WhatsApp at every step."}
        </p>
        <div className="mt-3 flex items-center gap-2 md:mt-0">
          <a
            href={buildWhatsAppLink(`Salam! Order ${order.orderNumber}.`, whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="tap inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-whatsapp)] px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-[var(--color-whatsapp-dark)]"
          >
            <MessageCircle size={13} />
            WhatsApp
          </a>
          <a
            href={`tel:${supportPhone.replace(/\s+/g, "")}`}
            className="tap inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[12.5px] font-semibold text-[var(--color-ink-800)]"
          >
            <Phone size={13} />
            Call
          </a>
          <Link
            href="/account/orders"
            className="tap inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-ink-900)] px-3 py-2 text-[12.5px] font-semibold text-white"
          >
            Open my orders
            <ArrowUpRight size={13} strokeWidth={2.4} />
          </Link>
        </div>
      </div>
    </Card>
  );
}

interface TimelineRowProps {
  entry: StorefrontOrderTimelineEntry;
  isLast: boolean;
  isCurrent: boolean;
}

function TimelineRow({ entry, isLast, isCurrent }: TimelineRowProps) {
  const completed = Boolean(entry.occurredAt);
  return (
    <li className="relative flex gap-3 pl-1">
      {!isLast && (
        <span
          aria-hidden
          className={classNames(
            "absolute left-[10px] top-6 bottom-[-12px] w-px",
            completed ? "bg-[var(--color-accent-300)]" : "bg-[var(--color-ink-100)]",
          )}
        />
      )}
      <span
        className={classNames(
          "z-10 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
          completed
            ? "border-[var(--color-accent-600)] bg-[var(--color-accent-600)] text-white"
            : isCurrent
              ? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)]"
              : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-400)]",
        )}
      >
        {completed ? (
          <Check size={10} strokeWidth={3.2} />
        ) : (
          <span className="size-1.5 rounded-full bg-current" />
        )}
      </span>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <p
            className={classNames(
              "text-[13.5px] font-semibold",
              completed ? "text-[var(--color-ink-900)]" : "text-[var(--color-ink-700)]",
            )}
          >
            {entry.label}
          </p>
          {entry.occurredAt && (
            <p className="text-[11px] text-[var(--color-ink-500)]">
              {formatStorefrontDateTime(entry.occurredAt)}
            </p>
          )}
        </div>
        {entry.description && (
          <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--color-ink-600)]">
            {entry.description}
          </p>
        )}
      </div>
    </li>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

function Field({ label, value, onChange, icon, placeholder, inputMode }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {label}
      </span>
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]">
            {icon}
          </span>
        )}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className={classNames(
            "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] text-sm text-[var(--color-ink-900)] transition-colors placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)]/30",
            icon ? "pl-9 pr-3" : "px-3.5",
          )}
        />
      </span>
    </label>
  );
}
