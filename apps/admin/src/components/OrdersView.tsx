"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Drawer } from "@/components/Drawer";
import { StatusPill, type StatusTone } from "@/components/StatusPill";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { adminFetch } from "@/lib/adminApi";
import { FIELD_LIMITS, formatPrice, ISO_DATE_LENGTH } from "@store/shared";
import type { AdminOrder, AdminOrderSummary } from "@/types/admin";

const STATUS_TONE: Record<string, StatusTone> = {
  "pending-payment": "warn",
  confirmed: "info",
  dispatched: "accent",
  delivered: "success",
  cancelled: "danger",
  refunded: "danger",
};

const STATUS_LABELS: Record<string, string> = {
  "pending-payment": "Pending payment",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const STATUS_OPTIONS = [
  "pending-payment",
  "confirmed",
  "dispatched",
  "delivered",
  "cancelled",
  "refunded",
] as const;

interface OrdersViewProps {
  orders: AdminOrderSummary[];
}

export function OrdersView({ orders }: OrdersViewProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === "all") {
      return orders;
    }
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("all", orders.length);
    for (const status of STATUS_OPTIONS) {
      map.set(status, orders.filter((order) => order.status === status).length);
    }
    return map;
  }, [orders]);

  const columns: DataTableColumn<AdminOrderSummary>[] = [
    {
      id: "order",
      header: "Order",
      cell: (order) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
            {order.orderNumber}
          </p>
          <p className="truncate text-[11px] text-[var(--color-ink-500)]">
            {new Date(order.placedAt).toLocaleString()}
          </p>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: (order) => (
        <div>
          <p className="text-sm font-medium text-[var(--color-ink-900)]">{order.customer.name}</p>
          <p className="text-[11px] text-[var(--color-ink-500)]">
            {order.customer.city} · {order.customer.phoneNumber}
          </p>
        </div>
      ),
    },
    {
      id: "items",
      header: "Items",
      hideOnMobile: true,
      cell: (order) => (
        <span className="text-sm text-[var(--color-ink-700)]">{order.itemCount} unit(s)</span>
      ),
    },
    {
      id: "payment",
      header: "Payment",
      hideOnMobile: true,
      cell: (order) => (
        <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-ink-600)]">
          {order.payment} · {order.delivery}
        </span>
      ),
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      cell: (order) => (
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">
          {formatPrice(order.totalRupees)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (order) => (
        <StatusPill tone={STATUS_TONE[order.status] ?? "neutral"}>
          {STATUS_LABELS[order.status] ?? order.status}
        </StatusPill>
      ),
    },
  ];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FilterChip
          label="All"
          count={counts.get("all") ?? 0}
          isActive={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        {STATUS_OPTIONS.map((status) => (
          <FilterChip
            key={status}
            label={STATUS_LABELS[status] ?? status}
            count={counts.get(status) ?? 0}
            isActive={statusFilter === status}
            onClick={() => setStatusFilter(status)}
          />
        ))}
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(order) => order.id}
        searchAccessor={(order) =>
          `${order.orderNumber} ${order.customer.name} ${order.customer.phoneNumber} ${order.customer.city}`
        }
        searchPlaceholder="Search by order number, customer…"
        onRowClick={(order) => setActiveOrderId(order.id)}
      />

      {activeOrderId ? (
        <OrderDrawer
          orderId={activeOrderId}
          onClose={() => setActiveOrderId(null)}
        />
      ) : null}
    </>
  );
}

interface OrderDrawerProps {
  orderId: string;
  onClose: () => void;
}

function OrderDrawer({ orderId, onClose }: OrderDrawerProps) {
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [status, setStatus] = useState<string>("");
  const [trackingNote, setTrackingNote] = useState("");
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState("");
  const [timelineNote, setTimelineNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    void (async () => {
      try {
        const fetched = await adminFetch<AdminOrder>(`/api/orders/${orderId}`);
        if (isCancelled) {
          return;
        }
        setOrder(fetched);
        setStatus(fetched.status);
        setTrackingNote(fetched.trackingNote ?? "");
        setEstimatedDeliveryAt(
          fetched.estimatedDeliveryAt ? fetched.estimatedDeliveryAt.slice(0, ISO_DATE_LENGTH) : "",
        );
      } catch (error) {
        if (isCancelled) {
          return;
        }
        toast.danger(error instanceof Error ? error.message : "Failed to load order");
        onClose();
      }
    })();
    return () => {
      isCancelled = true;
    };
    // `toast` and `onClose` are intentionally excluded — adding them would
    // trigger a re-fetch every time the parent re-renders (since onClose is
    // a fresh closure), which spams the API with no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) {
      return;
    }
    setIsSaving(true);
    try {
      const updated = await adminFetch<AdminOrder>(`/api/orders/${order.id}`, {
        method: "PUT",
        json: {
          status,
          trackingNote,
          estimatedDeliveryAt: estimatedDeliveryAt ? new Date(estimatedDeliveryAt).toISOString() : null,
          timelineNote: timelineNote || undefined,
        },
      });
      setOrder(updated);
      setTimelineNote("");
      toast.success("Order updated");
      router.refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to update order");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={order ? `Order ${order.orderNumber}` : "Loading…"}
      description={
        order
          ? `${order.customer.name} · ${order.customer.city} · ${new Date(order.placedAt).toLocaleString()}`
          : undefined
      }
      width="xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="order-form"
            isLoading={isSaving}
            disabled={!order}
          >
            Save changes
          </Button>
        </div>
      }
    >
      {order ? (
        <form id="order-form" onSubmit={handleSubmit} className="space-y-5">
          <section className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-3 text-xs">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                Items
              </p>
              <ul className="mt-1 space-y-1">
                {order.items.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-baseline justify-between gap-2 text-[var(--color-ink-700)]"
                  >
                    <span className="truncate">
                      {line.quantity}× {line.productName} · {line.variantSummary}
                    </span>
                    <span className="font-semibold text-[var(--color-ink-900)]">
                      {formatPrice(line.unitPriceRupees * line.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-1 border-t border-[var(--color-ink-100)] pt-2">
              <Row label="Subtotal" value={formatPrice(order.totals.subtotalRupees)} />
              <Row label="Shipping" value={formatPrice(order.totals.shippingRupees)} />
              {order.totals.discountRupees > 0 ? (
                <Row label="Discount" value={`-${formatPrice(order.totals.discountRupees)}`} />
              ) : null}
              <Row
                label="Total"
                value={formatPrice(order.totals.totalRupees)}
                isStrong
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                Payment & delivery
              </p>
              <p className="mt-0.5 text-[var(--color-ink-700)]">
                {order.payment} · {order.delivery}
              </p>
            </div>
            {order.address ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                  Delivery address
                </p>
                <p className="mt-0.5 text-[var(--color-ink-700)]">
                  {order.address.recipientName} · {order.address.phoneNumber}
                </p>
                <p className="text-[var(--color-ink-700)]">
                  {[order.address.street, order.address.area, order.address.city, order.address.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            ) : null}
          </section>

          <SelectField
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={STATUS_OPTIONS.map((option) => ({
              value: option,
              label: STATUS_LABELS[option] ?? option,
            }))}
          />

          <TextField
            label="Tracking note"
            value={trackingNote}
            onChange={(event) => setTrackingNote(event.target.value)}
            placeholder="Tracking #PP4823910"
            maxLength={FIELD_LIMITS.operatorNote}
          />
          <TextField
            label="Estimated delivery date"
            type="date"
            value={estimatedDeliveryAt}
            onChange={(event) => setEstimatedDeliveryAt(event.target.value)}
          />
          <TextArea
            label="Timeline note (optional)"
            value={timelineNote}
            onChange={(event) => setTimelineNote(event.target.value)}
            rows={2}
            placeholder="Optional note attached to the next status change."
            maxLength={FIELD_LIMITS.operatorNote}
          />

          {order.timeline.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                Timeline
              </p>
              <ol className="space-y-1.5">
                {order.timeline.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-[var(--radius-sm)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs"
                  >
                    <p className="font-semibold text-[var(--color-ink-900)]">
                      {STATUS_LABELS[entry.status] ?? entry.status}
                    </p>
                    <p className="text-[10px] text-[var(--color-ink-500)]">
                      {new Date(entry.occurredAt).toLocaleString()}
                    </p>
                    {entry.note ? <p className="mt-0.5 text-[var(--color-ink-700)]">{entry.note}</p> : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </form>
      ) : (
        <p className="text-sm text-[var(--color-ink-500)]">Loading order…</p>
      )}
    </Drawer>
  );
}

function Row({ label, value, isStrong }: { label: string; value: string; isStrong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[var(--color-ink-700)]">
      <span className="text-[var(--color-ink-500)]">{label}</span>
      <span
        className={
          isStrong
            ? "text-sm font-semibold text-[var(--color-ink-900)]"
            : "font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function FilterChip({ label, count, isActive, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        isActive
          ? "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-[var(--color-accent-100)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-accent-800)]"
          : "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-ink-700)] transition-colors hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink-900)]"
      }
    >
      {label}
      <span
        className={
          isActive
            ? "rounded-full bg-[var(--color-accent-200)]/70 px-1.5 text-[10px] font-semibold text-[var(--color-accent-800)]"
            : "rounded-full bg-[var(--color-canvas-deep)] px-1.5 text-[10px] font-semibold text-[var(--color-ink-500)]"
        }
      >
        {count}
      </span>
    </button>
  );
}
