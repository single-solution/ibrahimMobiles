"use client";

import Link from "next/link";
import {
  buildWhatsAppLink,
  classNames,
  formatPoints,
  formatPrice,
  formatStorefrontDate,
  formatStorefrontDateTime,
  LOYALTY_PROGRAM_NAME,
  PAYMENT_METHODS,
} from "@store/shared";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CreditCard,
  Headset,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

import type {
  StorefrontOrder,
  StorefrontOrderTimelineEntry,
} from "@/lib/storefront/orderSerializer";
import type { OrderStatus } from "@store/db";

const TONE: Record<
  OrderStatus,
  { toneBg: string; toneFg: string; toneDot: string; nextLabel?: string }
> = {
  "pending-payment": {
    toneBg: "bg-amber-50",
    toneFg: "text-amber-800",
    toneDot: "bg-amber-500",
    nextLabel: "Awaiting payment",
  },
  confirmed: {
    toneBg: "bg-sky-50",
    toneFg: "text-sky-800",
    toneDot: "bg-sky-500",
    nextLabel: "Packing",
  },
  dispatched: {
    toneBg: "bg-[var(--color-accent-100)]",
    toneFg: "text-[var(--color-accent-800)]",
    toneDot: "bg-[var(--color-accent-600)]",
    nextLabel: "On the way",
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

interface OrderDetailViewProps {
  order: StorefrontOrder;
}

export function OrderDetailView({ order }: OrderDetailViewProps) {
  const tone = TONE[order.status];
  const isCancelled = order.status === "cancelled" || order.status === "refunded";
  const paymentLabel = PAYMENT_METHODS.find((method) => method.id === order.payment)?.label;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8">
      <Link
        href="/account/orders"
        className="cta-arrow tap inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink-500)] hover:text-[var(--color-ink-800)]"
      >
        <ArrowLeft size={13} />
        All orders
      </Link>

      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            Order
          </p>
          <h1 className="mt-1 font-headline text-[34px] font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)] md:text-[44px]">
            {order.orderNumber}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-ink-500)] md:text-sm">
            Placed on {formatStorefrontDate(order.placedAt)} ·{" "}
            {order.delivery === "pickup" ? "Pickup at Hassan Centre" : "Door delivery"}
          </p>
        </div>
        <span
          className={classNames(
            "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-semibold",
            tone.toneBg,
            tone.toneFg,
          )}
        >
          <span className={classNames("size-1.5 rounded-full", tone.toneDot)} />
          {order.statusLabel}
          {tone.nextLabel && (
            <span className="hidden font-medium text-[var(--color-ink-500)] md:inline">
              · {tone.nextLabel}
            </span>
          )}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:mt-8 md:grid-cols-[1fr_360px] md:gap-6 lg:gap-8">
        <div className="space-y-4">
          {!isCancelled && order.timeline.length > 0 && <TrackingPanel order={order} />}
          <ItemsCard order={order} />
          <SupportCard orderNumber={order.orderNumber} />
        </div>

        <aside className="space-y-4 md:sticky md:top-[calc(var(--desktop-header-h)+24px)] md:self-start">
          <SummaryCard order={order} paymentLabel={paymentLabel} />
          {order.address && order.delivery === "courier" ? (
            <AddressCard address={order.address} />
          ) : order.delivery === "pickup" ? (
            <PickupCard />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function TrackingPanel({ order }: { order: StorefrontOrder }) {
  return (
    <Card className="overflow-hidden">
      <p className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)] md:px-5">
        Timeline
      </p>
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
      {order.estimatedDeliveryAt && (
        <div className="border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/40 p-3 px-4 text-[12.5px] text-[var(--color-ink-600)] md:px-5">
          <CalendarClock size={13} className="mr-1 inline-block align-text-bottom" />
          Estimated delivery {formatStorefrontDate(order.estimatedDeliveryAt)}
        </div>
      )}
    </Card>
  );
}

function TimelineRow({
  entry,
  isLast,
  isCurrent,
}: {
  entry: StorefrontOrderTimelineEntry;
  isLast: boolean;
  isCurrent: boolean;
}) {
  return (
    <li className="relative flex gap-3 pl-1">
      {!isLast && (
        <span
          aria-hidden
          className="absolute left-[10px] top-6 bottom-[-12px] w-px bg-[var(--color-accent-300)]"
        />
      )}
      <span
        className={classNames(
          "z-10 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
          "border-[var(--color-accent-600)] bg-[var(--color-accent-600)] text-white",
          isCurrent && "border-[var(--color-accent-500)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)]",
        )}
      >
        <Check size={10} strokeWidth={3.2} />
      </span>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <p className="text-[13.5px] font-semibold text-[var(--color-ink-900)]">{entry.label}</p>
          <p className="text-[11px] text-[var(--color-ink-500)]">
            {formatStorefrontDateTime(entry.occurredAt)}
          </p>
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

function ItemsCard({ order }: { order: StorefrontOrder }) {
  return (
    <Card className="overflow-hidden">
      <p className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)] md:px-5">
        Items in this order
      </p>
      <ul className="divide-y divide-[var(--color-ink-100)]">
        {order.items.map((line) => (
          <li key={line.id} className="flex items-center gap-3 p-4 md:p-5">
            <span className="grid size-12 place-items-center rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] text-[var(--color-ink-500)]">
              <Package size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[14px] font-semibold text-[var(--color-ink-900)]">
                {line.productName}
              </p>
              <p className="text-[12px] text-[var(--color-ink-500)]">
                {line.variantSummary}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[13.5px] font-semibold tabular-nums text-[var(--color-ink-900)]">
                {formatPrice(line.unitPriceRupees * line.quantity)}
              </p>
              <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-ink-400)]">
                Qty {line.quantity}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SupportCard({ orderNumber }: { orderNumber: string }) {
  const { supportPhone, whatsappNumber } = useStoreSettings();
  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
          <Headset size={14} />
        </span>
        <p className="text-[13px] font-semibold text-[var(--color-ink-900)]">
          Need a hand with this order?
        </p>
      </div>
      <p className="mt-2 text-[12.5px] text-[var(--color-ink-500)]">
        We reply on WhatsApp within minutes — every working day until 9 PM.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={buildWhatsAppLink(`Salam! Order ${orderNumber}.`, whatsappNumber)}
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
      </div>
    </Card>
  );
}

function SummaryCard({ order, paymentLabel }: { order: StorefrontOrder; paymentLabel?: string }) {
  return (
    <Card className="overflow-hidden">
      <p className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)] md:px-5">
        Summary
      </p>
      <dl className="space-y-2 p-4 text-[13px] md:p-5">
        <Row label="Subtotal" value={formatPrice(order.totals.subtotalRupees)} />
        <Row label="Delivery" value={order.totals.shippingRupees > 0 ? formatPrice(order.totals.shippingRupees) : "Free"} />
        {order.totals.discountRupees > 0 && (
          <Row label="Discount" value={`− ${formatPrice(order.totals.discountRupees)}`} />
        )}
        <div className="border-t border-[var(--color-ink-100)] pt-2">
          <Row
            label="Total"
            value={formatPrice(order.totals.totalRupees)}
            valueClassName="text-[15px] font-semibold text-[var(--color-ink-900)]"
          />
        </div>
        {paymentLabel && (
          <div className="flex items-center gap-2 pt-2 text-[12px] text-[var(--color-ink-600)]">
            <CreditCard size={13} className="text-[var(--color-ink-400)]" />
            Paid with {paymentLabel}
          </div>
        )}
        {(order.pointsEarned > 0 || order.pointsRedeemed > 0) && (
          <div className="mt-2 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent-50)] px-3 py-2 text-[12px] text-[var(--color-accent-800)]">
            <Sparkles size={13} />
            {order.pointsEarned > 0 && (
              <span>
                <span className="font-semibold">{formatPoints(order.pointsEarned)}</span>{" "}
                {LOYALTY_PROGRAM_NAME.toLowerCase()} earned
              </span>
            )}
            {order.pointsRedeemed > 0 && (
              <span>
                · {formatPoints(order.pointsRedeemed)} redeemed
              </span>
            )}
          </div>
        )}
      </dl>
      {order.status === "pending-payment" && (
        <div className="border-t border-[var(--color-ink-100)] p-4 md:p-5">
          <ButtonLink
            href={`/track?orderNumber=${encodeURIComponent(order.orderNumber)}`}
            variant="primary"
            size="sm"
            className="w-full cta-arrow"
          >
            Confirm payment via WhatsApp
          </ButtonLink>
        </div>
      )}
    </Card>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[var(--color-ink-500)]">{label}</dt>
      <dd className={classNames("tabular-nums text-[var(--color-ink-800)]", valueClassName)}>
        {value}
      </dd>
    </div>
  );
}

function AddressCard({
  address,
}: {
  address: NonNullable<StorefrontOrder["address"]>;
}) {
  return (
    <Card className="p-4 md:p-5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        Delivering to
      </p>
      <div className="mt-2 flex items-start gap-2">
        <Truck size={14} className="mt-0.5 shrink-0 text-[var(--color-ink-400)]" />
        <p className="text-[13px] leading-snug text-[var(--color-ink-800)]">
          <span className="font-semibold text-[var(--color-ink-900)]">
            {address.recipientName}
          </span>
          <br />
          {[address.street, address.area].filter(Boolean).join(", ")}
          <br />
          {address.city}
          {address.postalCode ? `, ${address.postalCode}` : ""}
          <br />
          <span className="text-[var(--color-ink-500)]">{address.phoneNumber}</span>
        </p>
      </div>
    </Card>
  );
}

function PickupCard() {
  const { storeAddressLine1, storeHours } = useStoreSettings();
  return (
    <Card className="p-4 md:p-5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        Pickup at the store
      </p>
      <div className="mt-2 flex items-start gap-2">
        <Store size={14} className="mt-0.5 shrink-0 text-[var(--color-ink-400)]" />
        <p className="text-[13px] leading-snug text-[var(--color-ink-800)]">
          <span className="font-semibold text-[var(--color-ink-900)]">{storeAddressLine1}</span>
          <br />
          <span className="text-[var(--color-ink-500)]">
            <MapPin size={11} className="mr-0.5 inline-block align-text-bottom" />
            {storeHours}
          </span>
        </p>
      </div>
    </Card>
  );
}
