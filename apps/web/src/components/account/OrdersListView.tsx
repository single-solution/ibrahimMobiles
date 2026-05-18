"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ChevronRight, Package } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { classNames, formatPrice, formatStorefrontDate } from "@store/shared";
import type { StorefrontOrder } from "@/lib/storefront/orderSerializer";
import type { OrderStatus } from "@store/db";

type FilterId = "all" | "active" | "delivered" | "cancelled";

const ACTIVE_STATUSES: OrderStatus[] = ["pending-payment", "confirmed", "dispatched"];
const TONE: Record<OrderStatus, { toneBg: string; toneFg: string; toneDot: string; nextLabel?: string }> = {
  "pending-payment": { toneBg: "bg-amber-50", toneFg: "text-amber-800", toneDot: "bg-amber-500", nextLabel: "Awaiting payment" },
  confirmed: { toneBg: "bg-sky-50", toneFg: "text-sky-800", toneDot: "bg-sky-500", nextLabel: "Packing" },
  dispatched: { toneBg: "bg-[var(--color-accent-100)]", toneFg: "text-[var(--color-accent-800)]", toneDot: "bg-[var(--color-accent-600)]", nextLabel: "On the way" },
  delivered: { toneBg: "bg-emerald-50", toneFg: "text-emerald-800", toneDot: "bg-emerald-500" },
  cancelled: { toneBg: "bg-rose-50", toneFg: "text-rose-800", toneDot: "bg-rose-500" },
  refunded: { toneBg: "bg-rose-50", toneFg: "text-rose-800", toneDot: "bg-rose-500" },
};

const FILTERS: { id: FilterId; label: string; matches: (order: StorefrontOrder) => boolean }[] = [
  { id: "all", label: "All", matches: () => true },
  { id: "active", label: "Active", matches: (order) => ACTIVE_STATUSES.includes(order.status) },
  { id: "delivered", label: "Delivered", matches: (order) => order.status === "delivered" },
  { id: "cancelled", label: "Cancelled", matches: (order) => order.status === "cancelled" || order.status === "refunded" },
];

interface OrdersListViewProps {
  orders: StorefrontOrder[];
}

export function OrdersListView({ orders }: OrdersListViewProps) {
  const [filter, setFilter] = useState<FilterId>("all");

  const filtered = useMemo(() => {
    const filterDef = FILTERS.find((definition) => definition.id === filter);
    if (!filterDef) {
      return orders;
    }
    return orders.filter(filterDef.matches);
  }, [filter, orders]);

  const counts = useMemo(() => {
    return FILTERS.reduce<Record<FilterId, number>>(
      (totals, definition) => {
        totals[definition.id] = orders.filter(definition.matches).length;
        return totals;
      },
      { all: 0, active: 0, delivered: 0, cancelled: 0 },
    );
  }, [orders]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8">
      <Link
        href="/account"
        className="cta-arrow tap inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink-500)] hover:text-[var(--color-ink-800)]"
      >
        <ArrowLeft size={13} />
        Back to account
      </Link>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            History
          </p>
          <h1 className="mt-1 font-headline text-[34px] font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)] md:text-[44px]">
            Your orders
          </h1>
        </div>
        <p className="hidden text-[12px] text-[var(--color-ink-500)] md:block">
          {orders.length} total
        </p>
      </div>

      <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 md:mt-6 [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((definition) => {
          const isActive = definition.id === filter;
          const count = counts[definition.id];
          return (
            <button
              key={definition.id}
              type="button"
              onClick={() => setFilter(definition.id)}
              className={classNames(
                "tap inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                isActive
                  ? "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
                  : "bg-[var(--color-surface)] text-[var(--color-ink-600)] hover:bg-[var(--color-canvas-deep)]",
              )}
            >
              {definition.label}
              <span
                className={classNames(
                  "grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold",
                  isActive
                    ? "bg-[var(--color-accent-600)] text-white"
                    : "bg-[var(--color-ink-100)] text-[var(--color-ink-700)]",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 md:mt-6">
        {filtered.length === 0 ? (
          <Empty filter={filter} />
        ) : (
          <ul className="space-y-3">
            {filtered.map((order) => (
              <li key={order.id} className="reveal">
                <OrderRow order={order} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface OrderRowProps {
  order: StorefrontOrder;
}

function OrderRow({ order }: OrderRowProps) {
  const tone = TONE[order.status];
  const firstItem = order.items[0];
  const extraCount = Math.max(0, order.items.length - 1);

  return (
    <Link
      href={`/account/orders/${order.orderNumber}`}
      className="lift group block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-4 py-2.5 md:px-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
          <span className="font-mono font-semibold text-[var(--color-ink-900)]">
            {order.orderNumber}
          </span>
          <span className="text-[var(--color-ink-400)]">·</span>
          <span className="text-[var(--color-ink-500)]">
            {formatStorefrontDate(order.placedAt)}
          </span>
        </div>
        <span
          className={classNames(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            tone.toneBg,
            tone.toneFg,
          )}
        >
          <span className={classNames("size-1.5 rounded-full", tone.toneDot)} />
          {order.statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-3 p-3 md:p-4">
        <div className="min-w-0 flex-1">
          {firstItem && (
            <p className="line-clamp-1 text-[14px] font-semibold text-[var(--color-ink-900)]">
              {firstItem.productName}
              {extraCount > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-[var(--color-ink-100)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--color-ink-700)]">
                  +{extraCount} more
                </span>
              )}
            </p>
          )}
          <p className="mt-0.5 line-clamp-1 text-[12px] text-[var(--color-ink-500)]">
            {tone.nextLabel ??
              `${order.totals.itemCount} item${order.totals.itemCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-semibold tracking-tight text-[var(--color-ink-900)]">
            {formatPrice(order.totals.totalRupees)}
          </p>
          <p className="mt-0.5 hidden text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-ink-400)] md:block">
            {order.delivery === "pickup" ? "Pickup" : "Delivery"}
          </p>
        </div>
        <ChevronRight
          size={15}
          className="text-[var(--color-ink-400)] transition-colors group-hover:text-[var(--color-accent-700)]"
        />
      </div>
    </Link>
  );
}

function Empty({ filter }: { filter: FilterId }) {
  const messages: Record<FilterId, string> = {
    all: "Your orders will live here once you place your first one.",
    active: "No active orders right now — everything is delivered or pending checkout.",
    delivered: "No delivered orders yet.",
    cancelled: "Nothing cancelled.",
  };
  return (
    <Card className="flex flex-col items-center gap-4 p-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[var(--color-ink-500)]">
        <Package size={20} />
      </span>
      <p className="max-w-xs text-[13px] text-[var(--color-ink-600)]">{messages[filter]}</p>
      <ButtonLink
        href="/shop"
        variant="primary"
        size="sm"
        className="cta-arrow"
        trailingIcon={<ArrowUpRight size={14} strokeWidth={2.4} />}
      >
        Browse phones
      </ButtonLink>
    </Card>
  );
}
