"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { StatusPill, type StatusTone } from "@/components/StatusPill";
import { TabList } from "@/components/Tabs";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { SelectField } from "@/components/forms/SelectField";
import { Switch } from "@/components/forms/Switch";
import { useToast } from "@/components/Toast";
import { AdminApiError, adminFetch } from "@/lib/adminApi";
import { getInitials } from "@/lib/initials";
import {
  FIELD_LIMITS,
  formatPrice,
  formatTimeAgo,
} from "@store/shared";
import type {
  AdminActivityEntry,
  AdminCustomer,
  AdminCustomerSummary,
  AdminInquirySummary,
  AdminLoyaltyAccount,
  AdminOrderSummary,
} from "@/types/admin";
import { CustomerAddressesSection } from "./CustomerAddressesSection";
import {
  CustomerErrorBanner,
  CustomerStatCard,
  type CustomerDetailTab,
} from "./customerDetailUi";

const EMAIL_MAX_CHARS = 320;
const RECENT_TRANSACTIONS_PREVIEW = 8;
const ORDER_REF_INPUT_MAX = 32;

const ORDER_STATUS_TONE: Record<string, StatusTone> = {
  "pending-payment": "warn",
  confirmed: "info",
  dispatched: "accent",
  delivered: "success",
  cancelled: "danger",
  refunded: "danger",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  "pending-payment": "Pending payment",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const INQUIRY_STATUS_TONE: Record<string, StatusTone> = {
  open: "info",
  "awaiting-customer": "warn",
  resolved: "success",
};

const LOYALTY_KIND_OPTIONS = [
  { value: "earn", label: "Earn (add)" },
  { value: "bonus", label: "Bonus (add)" },
  { value: "redeem", label: "Redeem (subtract)" },
  { value: "expire", label: "Expire (subtract)" },
  { value: "adjust", label: "Adjust (signed)" },
];

interface OrderListResponse {
  items: AdminOrderSummary[];
  total: number;
}

interface InquiryListResponse {
  items: AdminInquirySummary[];
  total: number;
}

interface ActivityListResponse {
  items: AdminActivityEntry[];
  total: number;
}

export interface CustomerDetailPanelProps {
  customerId: string;
  programmeRupeesPerPoint: number;
  canManage: boolean;
  canAdjustLoyalty: boolean;
  canViewInquiries: boolean;
  canViewActivity: boolean;
  onBack: () => void;
  onDelete: (summary: AdminCustomerSummary) => void;
  onSaved: () => void;
}

export function CustomerDetailPanel({
  customerId,
  programmeRupeesPerPoint,
  canManage,
  canAdjustLoyalty,
  canViewInquiries,
  canViewActivity,
  onBack,
  onDelete,
  onSaved,
}: CustomerDetailPanelProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<CustomerDetailTab>("overview");
  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [loyaltyAccount, setLoyaltyAccount] = useState<AdminLoyaltyAccount | null>(null);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [inquiries, setInquiries] = useState<AdminInquirySummary[]>([]);
  const [activity, setActivity] = useState<AdminActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [city, setCity] = useState("");
  const [isLoyaltyMember, setIsLoyaltyMember] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const requests: [
        Promise<AdminCustomer>,
        Promise<{ account: AdminLoyaltyAccount | null }>,
        Promise<OrderListResponse>,
        Promise<InquiryListResponse | null>,
        Promise<ActivityListResponse | null>,
      ] = [
        adminFetch<AdminCustomer>(`/api/customers/${customerId}`),
        adminFetch<{ account: AdminLoyaltyAccount | null }>(
          `/api/customers/${customerId}/loyalty`,
        ),
        adminFetch<OrderListResponse>(`/api/orders?customerId=${customerId}&limit=50`),
        canViewInquiries
          ? adminFetch<InquiryListResponse>(
              `/api/inquiries?customerId=${customerId}&limit=30`,
            )
          : Promise.resolve(null),
        canViewActivity
          ? adminFetch<ActivityListResponse>(
              `/api/activity?resourceType=customer&resourceId=${customerId}&limit=20`,
            )
          : Promise.resolve(null),
      ];

      const [detail, loyaltyRes, ordersRes, inquiriesRes, activityRes] =
        await Promise.all(requests);

      setCustomer(detail);
      setLoyaltyAccount(loyaltyRes.account);
      setOrders(ordersRes.items);
      setInquiries(inquiriesRes?.items ?? []);
      setActivity(activityRes?.items ?? []);
      setName(detail.name);
      setEmail(detail.email ?? "");
      setPhoneNumber(detail.phoneNumber);
      setCity(detail.city);
      setIsLoyaltyMember(detail.isLoyaltyMember);
      setNotes(detail.notes ?? "");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load customer",
      );
    } finally {
      setIsLoading(false);
    }
  }, [canViewActivity, canViewInquiries, customerId]);

  useEffect(() => {
    scheduleStateUpdate(() => {
      void load();
    });
  }, [load]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!canManage || !customer) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await adminFetch<AdminCustomer>(`/api/customers/${customer.id}`, {
        method: "PUT",
        json: {
          name,
          email: email || undefined,
          phoneNumber,
          city,
          isLoyaltyMember,
          notes: notes || undefined,
        },
      });
      setCustomer(updated);
      toast.success("Customer updated");
      onSaved();
    } catch (error) {
      const message =
        error instanceof AdminApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to save customer";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function copyCustomerId() {
    if (!customer) return;
    try {
      await navigator.clipboard.writeText(customer.id);
      toast.success("Customer ID copied");
    } catch {
      toast.danger("Could not copy ID");
    }
  }

  const tabs = useMemo(() => {
    if (!customer) return [];
    return [
      { id: "overview" as const, label: "Overview" },
      { id: "profile" as const, label: "Profile" },
      {
        id: "addresses" as const,
        label: "Addresses",
        count: customer.addresses.length,
      },
      { id: "orders" as const, label: "Orders", count: orders.length },
      { id: "loyalty" as const, label: "Loyalty" },
      ...(canViewInquiries
        ? [{ id: "inquiries" as const, label: "Inquiries", count: inquiries.length }]
        : []),
      ...(canViewActivity
        ? [{ id: "activity" as const, label: "Activity", count: activity.length }]
        : []),
    ];
  }, [activity.length, canViewActivity, canViewInquiries, customer, inquiries.length, orders.length]);

  if (isLoading && !customer) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-ink-500)]">
        Loading customer…
      </div>
    );
  }

  if (loadError || !customer) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <CustomerErrorBanner message={loadError ?? "Customer not found"} />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" leadingIcon={<RefreshCw size={13} />} onClick={() => void load()}>
            Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back to list
          </Button>
        </div>
      </div>
    );
  }

  const summary: AdminCustomerSummary = {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phoneNumber: customer.phoneNumber,
    city: customer.city,
    isLoyaltyMember: customer.isLoyaltyMember,
    loyaltyBalance: loyaltyAccount?.balance ?? 0,
    loyaltyLifetimeEarned: loyaltyAccount?.lifetimeEarned ?? 0,
    orderCount: customer.orderCount,
    lifetimeSpendRupees: customer.lifetimeSpendRupees,
    lastOrderAt: customer.lastOrderAt,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };

  const deleteBlocked = customer.orderCount > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-3 md:px-4">
        <button
          type="button"
          aria-label="Back to list"
          onClick={onBack}
          className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-600)] hover:bg-[var(--color-canvas-deep)] lg:hidden"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-ink-700)]">
          {getInitials(customer.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">{customer.name}</p>
          <p className="truncate text-xs text-[var(--color-ink-500)]">
            {customer.city} · {customer.phoneNumber}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<Phone size={12} />}
            onClick={() => {
              window.location.href = `tel:${customer.phoneNumber.replace(/\s+/g, "")}`;
            }}
          >
            Call
          </Button>
          {customer.email ? (
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<Mail size={12} />}
              onClick={() => {
                window.location.href = `mailto:${customer.email}`;
              }}
            >
              Email
            </Button>
          ) : null}
          {canManage ? (
            <Button
              variant="danger"
              size="sm"
              leadingIcon={<Trash2 size={12} />}
              onClick={() => onDelete(summary)}
              disabled={deleteBlocked}
              title={
                deleteBlocked
                  ? `Cannot delete — ${customer.orderCount} order${customer.orderCount === 1 ? "" : "s"} on record`
                  : undefined
              }
            >
              Delete
            </Button>
          ) : null}
        </div>
      </header>

      <TabList
        tabs={tabs}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as CustomerDetailTab)}
        compact
        fillWhenFew={false}
        aria-label="Customer sections"
        className="shrink-0 bg-[var(--color-surface)] px-2"
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5">
        {activeTab === "overview" ? (
          <OverviewTab
            customer={customer}
            loyaltyAccount={loyaltyAccount}
            programmeRupeesPerPoint={programmeRupeesPerPoint}
            orders={orders}
            inquiries={inquiries}
            deleteBlocked={deleteBlocked}
            onCopyId={() => void copyCustomerId()}
            onGoTab={setActiveTab}
          />
        ) : null}

        {activeTab === "profile" ? (
          <form onSubmit={handleSave} className="space-y-4">
            {saveError ? (
              <CustomerErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />
            ) : null}
            <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                Profile
              </p>
              <p className="mt-1 text-[10px] text-[var(--color-ink-500)]">
                Phone is the storefront login anchor (OTP). Changing it affects sign-in.
              </p>
              <div className="mt-3 space-y-3">
                <TextField
                  label="Full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  disabled={!canManage}
                  maxLength={FIELD_LIMITS.personName}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Phone"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    required
                    disabled={!canManage}
                    maxLength={FIELD_LIMITS.phoneNumber}
                  />
                  <TextField
                    label="City"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    required
                    disabled={!canManage}
                    maxLength={FIELD_LIMITS.city}
                  />
                </div>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={!canManage}
                  maxLength={EMAIL_MAX_CHARS}
                />
                <Switch
                  label="Loyalty member"
                  description="Enroll in the loyalty programme."
                  checked={isLoyaltyMember}
                  onCheckedChange={setIsLoyaltyMember}
                  disabled={!canManage}
                />
                <TextArea
                  label="Internal notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  disabled={!canManage}
                  maxLength={2_000}
                  placeholder="Support context, preferences, issues to watch…"
                />
              </div>
              {canManage ? (
                <div className="mt-4 flex justify-end">
                  <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
                    Save profile
                  </Button>
                </div>
              ) : null}
            </section>
          </form>
        ) : null}

        {activeTab === "addresses" ? (
          <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
            <CustomerAddressesSection
              key={customer.id}
              customer={customer}
              canManage={canManage}
              onUpdated={(updated) => {
                setCustomer(updated);
                onSaved();
              }}
            />
          </section>
        ) : null}

        {activeTab === "orders" ? (
          <OrdersTab orders={orders} />
        ) : null}

        {activeTab === "loyalty" ? (
          <LoyaltyTab
            customerId={customer.id}
            customerName={customer.name}
            programmeRupeesPerPoint={programmeRupeesPerPoint}
            account={loyaltyAccount}
            canAdjust={canAdjustLoyalty}
            onAccountUpdated={(account) => {
              setLoyaltyAccount(account);
              onSaved();
            }}
          />
        ) : null}

        {activeTab === "inquiries" && canViewInquiries ? (
          <InquiriesTab inquiries={inquiries} phoneNumber={customer.phoneNumber} />
        ) : null}

        {activeTab === "activity" && canViewActivity ? (
          <ActivityTab entries={activity} />
        ) : null}
      </div>
    </div>
  );
}

function OverviewTab({
  customer,
  loyaltyAccount,
  programmeRupeesPerPoint,
  orders,
  inquiries,
  deleteBlocked,
  onCopyId,
  onGoTab,
}: {
  customer: AdminCustomer;
  loyaltyAccount: AdminLoyaltyAccount | null;
  programmeRupeesPerPoint: number;
  orders: AdminOrderSummary[];
  inquiries: AdminInquirySummary[];
  deleteBlocked: boolean;
  onCopyId: () => void;
  onGoTab: (tab: CustomerDetailTab) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <CustomerStatCard
          label="Lifetime spend"
          value={formatPrice(customer.lifetimeSpendRupees)}
        />
        <CustomerStatCard label="Orders" value={String(customer.orderCount)} />
        <CustomerStatCard
          label="Loyalty balance"
          value={
            loyaltyAccount ? `${loyaltyAccount.balance.toLocaleString()} pts` : "—"
          }
          sub={
            loyaltyAccount
              ? formatPrice(loyaltyAccount.balance * programmeRupeesPerPoint)
              : undefined
          }
        />
      </div>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Account & support
        </p>
        <ul className="mt-3 space-y-2 text-xs text-[var(--color-ink-700)]">
          <li className="flex flex-wrap items-center gap-2">
            <span className="text-[var(--color-ink-500)]">Customer ID</span>
            <code className="rounded bg-[var(--color-canvas-deep)] px-1.5 py-0.5 font-mono text-[10px]">
              {customer.id}
            </code>
            <Button variant="ghost" size="sm" leadingIcon={<Copy size={11} />} onClick={onCopyId}>
              Copy
            </Button>
          </li>
          <li>
            <span className="text-[var(--color-ink-500)]">Storefront login</span>
            <span className="ml-2">OTP via {customer.phoneNumber}</span>
          </li>
          <li>
            <span className="text-[var(--color-ink-500)]">Member since</span>
            <span className="ml-2">{new Date(customer.createdAt).toLocaleString()}</span>
          </li>
          <li>
            <span className="text-[var(--color-ink-500)]">Last updated</span>
            <span className="ml-2">{formatTimeAgo(customer.updatedAt)}</span>
          </li>
          {deleteBlocked ? (
            <li className="rounded-[var(--radius-md)] border border-amber-100 bg-amber-50 px-2.5 py-2 text-amber-900">
              This customer has {customer.orderCount} order
              {customer.orderCount === 1 ? "" : "s"} — delete is blocked to preserve order history.
            </li>
          ) : null}
        </ul>
      </section>

      {customer.notes ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
            Internal notes
          </p>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[var(--color-ink-700)]">
            {customer.notes}
          </p>
        </section>
      ) : null}

      {orders.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Recent orders
            </p>
            <Button variant="ghost" size="sm" onClick={() => onGoTab("orders")}>
              View all
            </Button>
          </div>
          <OrdersTab orders={orders.slice(0, 3)} compact />
        </section>
      ) : null}

      {inquiries.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Recent inquiries
            </p>
            <Button variant="ghost" size="sm" onClick={() => onGoTab("inquiries")}>
              View all
            </Button>
          </div>
          <InquiriesTab inquiries={inquiries.slice(0, 3)} phoneNumber={customer.phoneNumber} compact />
        </section>
      ) : null}
    </div>
  );
}

function OrdersTab({ orders, compact }: { orders: AdminOrderSummary[]; compact?: boolean }) {
  if (orders.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] px-4 py-8 text-center text-xs text-[var(--color-ink-500)]">
        No orders yet.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/orders?order=${order.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--color-canvas-deep)]"
          >
            <span className="min-w-0">
              <span className="font-semibold text-[var(--color-ink-900)]">{order.orderNumber}</span>
              {!compact ? (
                <StatusPill tone={ORDER_STATUS_TONE[order.status] ?? "neutral"} className="ml-2">
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </StatusPill>
              ) : null}
              <span className="ml-2 text-[10px] text-[var(--color-ink-500)]">
                {formatTimeAgo(order.placedAt)} · {order.itemCount} item
                {order.itemCount === 1 ? "" : "s"}
              </span>
            </span>
            <span className="font-semibold text-[var(--color-ink-900)]">
              {formatPrice(order.totalRupees)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function InquiriesTab({
  inquiries,
  phoneNumber,
  compact,
}: {
  inquiries: AdminInquirySummary[];
  phoneNumber: string;
  compact?: boolean;
}) {
  if (inquiries.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] px-4 py-8 text-center text-xs text-[var(--color-ink-500)]">
        No inquiries linked to this customer.
        {!compact ? (
          <>
            {" "}
            Threads may still exist under phone{" "}
            <Link href="/inquiries" className="font-semibold text-[var(--color-accent-700)]">
              {phoneNumber}
            </Link>
            .
          </>
        ) : null}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {inquiries.map((inquiry) => (
        <li key={inquiry.id}>
          <Link
            href="/inquiries"
            className="flex items-start justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2.5 transition-colors hover:bg-[var(--color-canvas-deep)]"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <MessageSquare size={13} className="shrink-0 text-[var(--color-ink-400)]" />
                <span className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
                  {inquiry.subjectProductName ?? "General inquiry"}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-[var(--color-ink-500)]">
                {inquiry.lastMessagePreview || "No messages"}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <StatusPill tone={INQUIRY_STATUS_TONE[inquiry.status] ?? "neutral"}>
                {inquiry.status}
              </StatusPill>
              <span className="mt-1 block text-[10px] text-[var(--color-ink-400)]">
                {formatTimeAgo(inquiry.lastMessageAt)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ActivityTab({ entries }: { entries: AdminActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] px-4 py-8 text-center text-xs text-[var(--color-ink-500)]">
        No activity recorded for this customer yet.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2 text-xs"
        >
          <p className="font-semibold text-[var(--color-ink-900)]">
            {entry.action} · {entry.resourceLabel}
          </p>
          <p className="text-[10px] text-[var(--color-ink-500)]">
            {entry.actorName} · {formatTimeAgo(entry.createdAt)}
          </p>
          {entry.detail ? (
            <p className="mt-0.5 text-[var(--color-ink-700)]">{entry.detail}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function LoyaltyTab({
  customerId,
  customerName,
  programmeRupeesPerPoint,
  account,
  canAdjust,
  onAccountUpdated,
}: {
  customerId: string;
  customerName: string;
  programmeRupeesPerPoint: number;
  account: AdminLoyaltyAccount | null;
  canAdjust: boolean;
  onAccountUpdated: (account: AdminLoyaltyAccount) => void;
}) {
  const toast = useToast();
  const [kind, setKind] = useState("earn");
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = account?.balance ?? 0;
  const lifetime = account?.lifetimeEarned ?? 0;

  async function handleAdjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAdjust) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await adminFetch<AdminLoyaltyAccount>(
        `/api/loyalty/${customerId}/transactions`,
        {
          method: "POST",
          json: { kind, amount, reason, orderRef: orderRef || undefined },
        },
      );
      onAccountUpdated(updated);
      setReason("");
      setOrderRef("");
      toast.success("Loyalty balance updated");
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to adjust loyalty",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        Loyalty programme
      </p>
      {error ? <CustomerErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
      {!account ? (
        <p className="text-xs text-[var(--color-ink-500)]">
          No loyalty account yet — post an adjustment to create one for {customerName}.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          <CustomerStatCard label="Balance" value={`${balance.toLocaleString()} pts`} />
          <CustomerStatCard
            label="Cash value"
            value={formatPrice(balance * programmeRupeesPerPoint)}
          />
          <CustomerStatCard label="Lifetime earned" value={`${lifetime.toLocaleString()} pts`} />
        </div>
      )}

      {canAdjust ? (
        <form onSubmit={handleAdjust} className="space-y-3 border-t border-[var(--color-ink-100)] pt-3">
          <SelectField
            label="Adjustment kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            options={LOYALTY_KIND_OPTIONS}
          />
          <TextField
            label="Points"
            type="number"
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value) || 0)}
            required
          />
          <TextField
            label="Order ref (optional)"
            value={orderRef}
            onChange={(event) => setOrderRef(event.target.value)}
            maxLength={ORDER_REF_INPUT_MAX}
          />
          <TextArea
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            required
            maxLength={FIELD_LIMITS.shortText}
          />
          <Button type="submit" variant="secondary" size="sm" isLoading={isSaving}>
            Apply adjustment
          </Button>
        </form>
      ) : null}

      {account && account.transactions.length > 0 ? (
        <ul className="space-y-1.5 border-t border-[var(--color-ink-100)] pt-3">
          {account.transactions
            .slice(-RECENT_TRANSACTIONS_PREVIEW)
            .reverse()
            .map((transaction) => (
              <li
                key={transaction.id}
                className="rounded-[var(--radius-sm)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-2.5 py-1.5 text-xs"
              >
                <p className="font-semibold text-[var(--color-ink-900)]">
                  {transaction.kind} ·{" "}
                  {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount} pts
                </p>
                <p className="text-[10px] text-[var(--color-ink-500)]">
                  {new Date(transaction.occurredAt).toLocaleString()}
                </p>
                <p className="text-[var(--color-ink-700)]">{transaction.reason}</p>
              </li>
            ))}
        </ul>
      ) : null}
    </section>
  );
}
