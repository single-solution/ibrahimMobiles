"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Phone,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { useAdminPermissions } from "@/lib/adminPermissionsContext";
import { StatusPill, type StatusTone } from "@/components/StatusPill";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { useToast } from "@/components/Toast";
import {
  WorkspaceDetailHeader,
  WorkspaceEmptyPane,
  WorkspaceFilterChip,
  WorkspaceFrame,
  WorkspacePaneHeader,
  WorkspaceSearchField,
  WorkspaceSidebarNavItem,
} from "@/components/workspace/adminWorkspaceUi";
import { adminFetch } from "@/lib/adminApi";
import {
  classNames,
  FIELD_LIMITS,
  formatPrice,
  formatTimeAgo,
  ISO_DATE_LENGTH,
} from "@store/shared";
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

type StatusFilter = "all" | (typeof STATUS_OPTIONS)[number];

interface OrdersCatalogProps {
  orders: AdminOrderSummary[];
}

export function OrdersCatalog(props: OrdersCatalogProps) {
  return (
    <Suspense fallback={null}>
      <OrdersCatalogInner {...props} />
    </Suspense>
  );
}

function OrdersCatalogInner({ orders }: OrdersCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = useAdminPermissions();
  const canUpdate = can("order_update");
  const canDelete = can("order_delete");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const setActiveOrderUrl = useCallback(
    (id: string | null) => {
      setActiveOrderId(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("order", id);
      } else {
        params.delete("order");
      }
      const query = params.toString();
      router.replace(query ? `/orders?${query}` : "/orders", { scroll: false });
    },
    [router, searchParams],
  );

  const clearActiveOrder = useCallback(() => {
    setActiveOrderUrl(null);
  }, [setActiveOrderUrl]);

  const stats = useMemo(() => {
    const revenue = orders
      .filter((order) => !["cancelled", "refunded"].includes(order.status))
      .reduce((sum, order) => sum + order.totalRupees, 0);
    const pending = orders.filter((order) => order.status === "pending-payment").length;
    return { revenue, pending, total: orders.length };
  }, [orders]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("all", orders.length);
    for (const status of STATUS_OPTIONS) {
      map.set(status, orders.filter((order) => order.status === status).length);
    }
    return map;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let rows = orders;
    if (statusFilter !== "all") {
      rows = rows.filter((order) => order.status === statusFilter);
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((order) =>
      `${order.orderNumber} ${order.customer.name} ${order.customer.phoneNumber} ${order.customer.city} ${order.payment} ${order.delivery}`
        .toLowerCase()
        .includes(query),
    );
  }, [orders, statusFilter, searchQuery]);

  useEffect(() => {
    scheduleStateUpdate(() => {
      const fromUrl = searchParams.get("order");
      if (fromUrl && orders.some((order) => order.id === fromUrl)) {
        setActiveOrderId(fromUrl);
        return;
      }
      if (filteredOrders.length === 0) {
        if (activeOrderId !== null) {
          setActiveOrderUrl(null);
        }
        return;
      }
      const stillVisible =
        activeOrderId !== null &&
        filteredOrders.some((order) => order.id === activeOrderId);
      if (stillVisible) return;
      const preferDesktop =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 1024px)").matches;
      setActiveOrderUrl(preferDesktop ? filteredOrders[0].id : null);
    });
  }, [activeOrderId, filteredOrders, orders, searchParams, setActiveOrderUrl]);

  return (
    <WorkspaceFrame>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="hidden shrink-0 flex-col border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-2.5 lg:flex lg:w-44 lg:border-b-0 lg:border-r xl:w-48">
          <p className="pb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
            Status
          </p>
          <nav aria-label="Order status views" className="-mx-1 flex-1 overflow-y-auto">
            <ul className="flex flex-col gap-0.5">
              <WorkspaceSidebarNavItem
                label="All orders"
                count={counts.get("all") ?? 0}
                isActive={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
              />
              {STATUS_OPTIONS.map((status) => (
                <WorkspaceSidebarNavItem
                  key={status}
                  label={STATUS_LABELS[status]}
                  count={counts.get(status) ?? 0}
                  isActive={statusFilter === status}
                  onClick={() => setStatusFilter(status)}
                />
              ))}
            </ul>
          </nav>
          <div className="mt-3 space-y-2 border-t border-[var(--color-ink-100)] pt-3 text-[10px] text-[var(--color-ink-500)]">
            <p>
              <span className="font-semibold text-[var(--color-ink-800)]">{stats.total}</span>{" "}
              orders
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink-800)]">{stats.pending}</span>{" "}
              awaiting payment
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink-800)]">
                {formatPrice(stats.revenue)}
              </span>{" "}
              net revenue
            </p>
          </div>
        </aside>

        <section
          className={classNames(
            "flex w-full shrink-0 flex-col border-b border-[var(--color-ink-100)] lg:w-[min(340px,38%)] lg:max-w-sm lg:border-b-0 lg:border-r",
            activeOrderId && "hidden lg:flex",
          )}
        >
          <WorkspacePaneHeader
            icon={ShoppingCart}
            title="Orders"
            subtitle={`${filteredOrders.length} shown (recent 200) · ${formatPrice(stats.revenue)} in view`}
            search={
              <>
                <WorkspaceSearchField
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search orders…"
                  aria-label="Search orders"
                  className="w-full"
                />
                <div className="flex flex-wrap gap-1 lg:hidden" role="group" aria-label="Status filter">
                  <WorkspaceFilterChip
                    compact
                    label="All"
                    isActive={statusFilter === "all"}
                    onClick={() => setStatusFilter("all")}
                  />
                  {STATUS_OPTIONS.map((status) => (
                    <WorkspaceFilterChip
                      key={status}
                      compact
                      label={STATUS_LABELS[status]}
                      isActive={statusFilter === status}
                      onClick={() => setStatusFilter(status)}
                    />
                  ))}
                </div>
              </>
            }
          />
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {filteredOrders.length === 0 ? (
              <li className="px-4 py-6">
                <WorkspaceEmptyPane
                  icon={ShoppingCart}
                  title={searchQuery.trim() ? "No matching orders" : "No orders in this view"}
                  description={
                    searchQuery.trim()
                      ? "Try a different search or status filter."
                      : "Orders will appear here when customers checkout."
                  }
                />
              </li>
            ) : (
              filteredOrders.map((order) => (
                <li key={order.id}>
                  <OrderListItem
                    order={order}
                    isActive={order.id === activeOrderId}
                    onSelect={() => setActiveOrderUrl(order.id)}
                  />
                </li>
              ))
            )}
          </ul>
        </section>

        <section
          className={classNames(
            "flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-canvas)]",
            !activeOrderId && "hidden lg:flex",
          )}
        >
          {activeOrderId ? (
            <OrderDetailPanel
              orderId={activeOrderId}
              onBack={clearActiveOrder}
              canUpdate={canUpdate}
              canDelete={canDelete}
            />
          ) : (
            <WorkspaceEmptyPane
              icon={ShoppingCart}
              title="Select an order"
              description="Choose an order from the list to review items, update status, and manage fulfillment."
            />
          )}
        </section>
      </div>
    </WorkspaceFrame>
  );
}

function OrderListItem({
  order,
  isActive,
  onSelect,
}: {
  order: AdminOrderSummary;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={classNames(
        "tap flex w-full gap-3 border-b border-[var(--color-ink-100)] px-3 py-3 text-left transition-colors",
        isActive ? "bg-[var(--color-accent-50)]" : "hover:bg-[var(--color-canvas-deep)]",
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] text-[var(--color-accent-700)]">
        <Package size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
            {order.orderNumber}
          </span>
          <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-ink-400)]">
            {formatTimeAgo(order.placedAt)}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--color-ink-600)]">
          {order.customer.name} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusPill tone={STATUS_TONE[order.status] ?? "neutral"}>
            {STATUS_LABELS[order.status] ?? order.status}
          </StatusPill>
          <span className="text-xs font-semibold text-[var(--color-ink-900)]">
            {formatPrice(order.totalRupees)}
          </span>
        </span>
      </span>
    </button>
  );
}

function OrderDetailPanel({
  orderId,
  onBack,
  canUpdate,
  canDelete,
}: {
  orderId: string;
  onBack: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [status, setStatus] = useState("");
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState("");
  const [timelineNote, setTimelineNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const fetched = await adminFetch<AdminOrder>(`/api/orders/${orderId}`);
        if (cancelled) return;
        setOrder(fetched);
        setStatus(fetched.status);
        setEstimatedDeliveryAt(
          fetched.estimatedDeliveryAt
            ? fetched.estimatedDeliveryAt.slice(0, ISO_DATE_LENGTH)
            : "",
        );
      } catch (error) {
        if (!cancelled) {
          toast.danger(error instanceof Error ? error.message : "Failed to load order");
          onBack();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, onBack, toast]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    setIsSaving(true);
    try {
      const updated = await adminFetch<AdminOrder>(`/api/orders/${order.id}`, {
        method: "PUT",
        json: {
          status,
          estimatedDeliveryAt: estimatedDeliveryAt
            ? new Date(estimatedDeliveryAt).toISOString()
            : null,
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

  async function handleDelete() {
    if (!order) return;
    setIsDeleting(true);
    try {
      await adminFetch(`/api/orders/${order.id}`, { method: "DELETE" });
      toast.success(`Order ${order.orderNumber} deleted`);
      router.refresh();
      onBack();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to delete order");
      setIsDeleting(false);
    }
  }

  if (!order) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-ink-500)]">
        Loading order…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!canUpdate ? (
        <p className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-3 py-2 text-center text-[11px] text-[var(--color-ink-600)]">
          Read-only — you can view orders but not change status.
        </p>
      ) : null}
      <WorkspaceDetailHeader
        onBack={onBack}
        backLabel="Back to orders"
        title={order.orderNumber}
        subtitle={`${new Date(order.placedAt).toLocaleString()} · ${order.payment} · ${order.delivery}`}
        badge={
          <StatusPill tone={STATUS_TONE[order.status] ?? "neutral"}>
            {STATUS_LABELS[order.status] ?? order.status}
          </StatusPill>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<Phone size={12} />}
              onClick={() => {
                window.location.href = `tel:${order.customer.phoneNumber.replace(/\s+/g, "")}`;
              }}
            >
              Call
            </Button>
            {order.customer.id ? (
              <Link
                href={`/customers?customer=${order.customer.id}`}
                className="inline-flex h-8 items-center rounded-[var(--radius-md)] border border-[var(--color-ink-200)] px-2.5 text-xs font-semibold text-[var(--color-ink-800)] hover:bg-[var(--color-canvas-deep)]"
              >
                Customer
              </Link>
            ) : null}
            {canDelete ? (
              <Button
                variant="danger"
                size="sm"
                type="button"
                onClick={() => setConfirmDelete(true)}
                isLoading={isDeleting}
                disabled={isSaving}
                leadingIcon={<Trash2 size={12} />}
              >
                Delete
              </Button>
            ) : null}
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5">
        <form id={`order-form-${order.id}`} onSubmit={handleSubmit} className="space-y-5">
          <section className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                Customer
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                {order.customer.name}
              </p>
              <p className="text-xs text-[var(--color-ink-600)]">
                {order.customer.city} · {order.customer.phoneNumber}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                Loyalty
              </p>
              <p className="mt-1 text-sm text-[var(--color-ink-800)]">
                {order.pointsEarned > 0 ? `+${order.pointsEarned} earned` : "No points earned"}
                {order.pointsRedeemed > 0 ? ` · ${order.pointsRedeemed} redeemed` : ""}
              </p>
            </div>
          </section>

          <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Line items
            </p>
            <ul className="mt-2 space-y-2">
              {order.items.map((line) => (
                <li
                  key={line.id}
                  className="flex items-baseline justify-between gap-3 text-sm text-[var(--color-ink-800)]"
                >
                  <span className="min-w-0 truncate">
                    {line.quantity}× {line.productName}
                    <span className="text-[var(--color-ink-500)]"> · {line.variantSummary}</span>
                  </span>
                  <span className="shrink-0 font-semibold">
                    {formatPrice(line.unitPriceRupees * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 border-t border-[var(--color-ink-100)] pt-3 text-sm">
              <TotalRow label="Subtotal" value={formatPrice(order.totals.subtotalRupees)} />
              <TotalRow label="Shipping" value={formatPrice(order.totals.shippingRupees)} />
              {order.totals.discountRupees > 0 ? (
                <TotalRow
                  label="Discount"
                  value={`-${formatPrice(order.totals.discountRupees)}`}
                />
              ) : null}
              <TotalRow
                label="Total"
                value={formatPrice(order.totals.totalRupees)}
                strong
              />
            </div>
          </section>

          {order.address ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                Delivery address
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--color-ink-900)]">
                {order.address.recipientName} · {order.address.phoneNumber}
              </p>
              <p className="text-xs leading-relaxed text-[var(--color-ink-600)]">
                {[order.address.street, order.address.area, order.address.city, order.address.postalCode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </section>
          ) : null}

          <section className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 sm:grid-cols-2">
            <SelectField
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={!canUpdate}
              options={STATUS_OPTIONS.map((option) => ({
                value: option,
                label: STATUS_LABELS[option] ?? option,
              }))}
            />
            <TextField
              label="Estimated delivery"
              type="date"
              value={estimatedDeliveryAt}
              onChange={(event) => setEstimatedDeliveryAt(event.target.value)}
              disabled={!canUpdate}
            />
            <div className="sm:col-span-2">
              <TextArea
                label="Timeline note (optional)"
                value={timelineNote}
                onChange={(event) => setTimelineNote(event.target.value)}
                rows={2}
                disabled={!canUpdate}
                placeholder="Note attached to the next status change."
                maxLength={FIELD_LIMITS.operatorNote}
              />
            </div>
          </section>

          {order.timeline.length > 0 ? (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                Timeline
              </p>
              <ol className="mt-2 space-y-2">
                {order.timeline.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2 text-xs"
                  >
                    <p className="font-semibold text-[var(--color-ink-900)]">
                      {STATUS_LABELS[entry.status] ?? entry.status}
                    </p>
                    <p className="text-[10px] text-[var(--color-ink-500)]">
                      {new Date(entry.occurredAt).toLocaleString()}
                    </p>
                    {entry.note ? (
                      <p className="mt-0.5 text-[var(--color-ink-700)]">{entry.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </form>
      </div>

      {canUpdate ? (
        <footer className="shrink-0 border-t border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-3">
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form={`order-form-${order.id}`}
              isLoading={isSaving}
              disabled={isDeleting}
            >
              Save changes
            </Button>
          </div>
        </footer>
      ) : null}

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete order?"
        message={
          <>
            Delete <strong>{order.orderNumber}</strong>? Stock and loyalty adjustments will be
            reversed when applicable.
          </>
        }
        tone="danger"
        confirmLabel="Delete order"
        onConfirm={() => {
          setConfirmDelete(false);
          void handleDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[var(--color-ink-500)]">{label}</span>
      <span
        className={
          strong
            ? "text-base font-semibold text-[var(--color-ink-900)]"
            : "font-medium text-[var(--color-ink-800)]"
        }
      >
        {value}
      </span>
    </div>
  );
}
