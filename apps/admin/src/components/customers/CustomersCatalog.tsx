"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { Drawer } from "@/components/Drawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusPill } from "@/components/StatusPill";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { Switch } from "@/components/forms/Switch";
import { useToast } from "@/components/Toast";
import {
  WorkspaceEmptyPane,
  WorkspaceFilterChip,
  WorkspaceFrame,
  WorkspacePaneHeader,
  WorkspaceSearchField,
  WorkspaceSidebarNavItem,
} from "@/components/workspace/adminWorkspaceUi";
import { CustomerDetailPanel } from "./CustomerDetailPanel";
import { adminFetch } from "@/lib/adminApi";
import { useAdminPermissions } from "@/lib/adminPermissionsContext";
import { getInitials } from "@/lib/initials";
import {
  classNames,
  FIELD_LIMITS,
  formatPrice,
  formatTimeAgo,
} from "@store/shared";
import type { AdminCustomerSummary } from "@/types/admin";

const EMAIL_MAX_CHARS = 320;

type SegmentFilter = "all" | "loyalty" | "active";

interface CustomersCatalogProps {
  customers: AdminCustomerSummary[];
  programmeRupeesPerPoint: number;
}

export function CustomersCatalog(props: CustomersCatalogProps) {
  return (
    <Suspense fallback={null}>
      <CustomersCatalogInner {...props} />
    </Suspense>
  );
}

function CustomersCatalogInner({
  customers,
  programmeRupeesPerPoint,
}: CustomersCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { can } = useAdminPermissions();

  const [segment, setSegment] = useState<SegmentFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AdminCustomerSummary | null>(null);

  const canManage = can("customer_manage");
  const canAdjustLoyalty = can("loyalty_manage") || can("customer_manage");

  const stats = useMemo(() => {
    const totalBalance = customers.reduce((sum, row) => sum + row.loyaltyBalance, 0);
    const members = customers.filter((row) => row.isLoyaltyMember).length;
    const withOrders = customers.filter((row) => row.orderCount > 0).length;
    return { totalBalance, members, withOrders };
  }, [customers]);

  const segmentCounts = useMemo(
    () => ({
      all: customers.length,
      loyalty: customers.filter((row) => row.isLoyaltyMember).length,
      active: customers.filter((row) => row.orderCount > 0).length,
    }),
    [customers],
  );

  const filteredCustomers = useMemo(() => {
    let rows = customers;
    if (segment === "loyalty") {
      rows = rows.filter((row) => row.isLoyaltyMember);
    } else if (segment === "active") {
      rows = rows.filter((row) => row.orderCount > 0);
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      `${row.name} ${row.email ?? ""} ${row.phoneNumber} ${row.city}`
        .toLowerCase()
        .includes(query),
    );
  }, [customers, segment, searchQuery]);

  const setActiveCustomerUrl = useCallback(
    (id: string | null) => {
      setActiveId(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("customer", id);
      } else {
        params.delete("customer");
      }
      const query = params.toString();
      router.replace(query ? `/customers?${query}` : "/customers", { scroll: false });
    },
    [router, searchParams],
  );

  const clearActiveCustomer = useCallback(() => {
    setActiveCustomerUrl(null);
  }, [setActiveCustomerUrl]);

  useEffect(() => {
    scheduleStateUpdate(() => {
      const fromUrl = searchParams.get("customer");
      if (fromUrl && customers.some((row) => row.id === fromUrl)) {
        setActiveId(fromUrl);
        return;
      }
      if (filteredCustomers.length === 0) {
        if (activeId !== null) {
          setActiveCustomerUrl(null);
        }
        return;
      }
      const stillVisible =
        activeId !== null && filteredCustomers.some((row) => row.id === activeId);
      if (stillVisible) return;
      const preferDesktop =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 1024px)").matches;
      setActiveCustomerUrl(preferDesktop ? filteredCustomers[0].id : null);
    });
  }, [activeId, filteredCustomers, customers, searchParams, setActiveCustomerUrl]);

  function refresh() {
    router.refresh();
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await adminFetch(`/api/customers/${toDelete.id}`, { method: "DELETE" });
      toast.warn(`"${toDelete.name}" deleted`);
      setToDelete(null);
      setActiveCustomerUrl(null);
      refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to delete customer");
    }
  }

  return (
    <>
      <WorkspaceFrame>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="hidden shrink-0 flex-col border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-2.5 lg:flex lg:w-44 lg:border-b-0 lg:border-r xl:w-48">
            <p className="pb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Segments
            </p>
            <nav aria-label="Customer segments" className="-mx-1 flex-1 overflow-y-auto">
              <ul className="flex flex-col gap-0.5">
                <WorkspaceSidebarNavItem
                  label="All customers"
                  count={segmentCounts.all}
                  isActive={segment === "all"}
                  onClick={() => setSegment("all")}
                />
                <WorkspaceSidebarNavItem
                  label="Loyalty members"
                  count={segmentCounts.loyalty}
                  isActive={segment === "loyalty"}
                  onClick={() => setSegment("loyalty")}
                />
                <WorkspaceSidebarNavItem
                  label="With orders"
                  count={segmentCounts.active}
                  isActive={segment === "active"}
                  onClick={() => setSegment("active")}
                />
              </ul>
            </nav>
            <div className="mt-3 space-y-2 border-t border-[var(--color-ink-100)] pt-3 text-[10px] text-[var(--color-ink-500)]">
              <p>
                <span className="font-semibold text-[var(--color-ink-800)]">
                  {stats.members}
                </span>{" "}
                enrolled
              </p>
              <p>
                <span className="font-semibold text-[var(--color-ink-800)]">
                  {stats.totalBalance.toLocaleString()}
                </span>{" "}
                pts outstanding
              </p>
            </div>
          </aside>

          <section
            className={classNames(
              "flex w-full shrink-0 flex-col border-b border-[var(--color-ink-100)] lg:w-[min(340px,38%)] lg:max-w-sm lg:border-b-0 lg:border-r",
              activeId && "hidden lg:flex",
            )}
          >
            <WorkspacePaneHeader
              icon={UserCircle}
              title="Customers"
              subtitle={`${filteredCustomers.length} shown · ${formatPrice(stats.totalBalance * programmeRupeesPerPoint)} loyalty value`}
              action={
                canManage ? (
                  <Button
                    variant="primary"
                    size="sm"
                    leadingIcon={<Plus size={14} />}
                    onClick={() => setCreateOpen(true)}
                  >
                    Add
                  </Button>
                ) : undefined
              }
              search={
                <>
                  <WorkspaceSearchField
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search customers…"
                    aria-label="Search customers"
                    className="w-full"
                  />
                  <div className="flex flex-wrap gap-1 lg:hidden">
                    <WorkspaceFilterChip
                      compact
                      label="All"
                      isActive={segment === "all"}
                      onClick={() => setSegment("all")}
                    />
                    <WorkspaceFilterChip
                      compact
                      label="Loyalty"
                      isActive={segment === "loyalty"}
                      onClick={() => setSegment("loyalty")}
                    />
                    <WorkspaceFilterChip
                      compact
                      label="Orders"
                      isActive={segment === "active"}
                      onClick={() => setSegment("active")}
                    />
                  </div>
                </>
              }
            />
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <li className="px-4 py-8 text-center text-xs text-[var(--color-ink-500)]">
                  {searchQuery.trim() ? "No customers match your search." : "No customers in this view."}
                </li>
              ) : (
                filteredCustomers.map((customer) => (
                  <li key={customer.id}>
                    <CustomerListItem
                      customer={customer}
                      isActive={customer.id === activeId}
                      onSelect={() => setActiveCustomerUrl(customer.id)}
                    />
                  </li>
                ))
              )}
            </ul>
          </section>

          <section
            className={classNames(
              "flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-canvas)]",
              !activeId && "hidden lg:flex",
            )}
          >
            {activeId ? (
              <CustomerDetailPanel
                customerId={activeId}
                programmeRupeesPerPoint={programmeRupeesPerPoint}
                canManage={canManage}
                canAdjustLoyalty={canAdjustLoyalty}
                canViewInquiries={can("inquiry_view")}
                canViewActivity={can("activity_view")}
                onBack={clearActiveCustomer}
                onDelete={(summary) => setToDelete(summary)}
                onSaved={refresh}
              />
            ) : (
              <WorkspaceEmptyPane
                icon={UserCircle}
                title="Select a customer"
                description="View profile, order history, loyalty balance, and addresses in one place."
                action={
                  canManage ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      leadingIcon={<Plus size={14} />}
                      onClick={() => setCreateOpen(true)}
                    >
                      Add customer
                    </Button>
                  ) : undefined
                }
              />
            )}
          </section>
        </div>
      </WorkspaceFrame>

      {createOpen ? (
        <CustomerCreateDrawer
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        isOpen={toDelete !== null}
        title="Delete customer?"
        message={
          <>
            Deleting <strong>{toDelete?.name}</strong> removes their record permanently.
            Customers with orders cannot be deleted.
          </>
        }
        tone="danger"
        confirmLabel="Delete customer"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

function CustomerListItem({
  customer,
  isActive,
  onSelect,
}: {
  customer: AdminCustomerSummary;
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
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-ink-700)]">
        {getInitials(customer.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
            {customer.name}
          </span>
          {customer.lastOrderAt ? (
            <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-ink-400)]">
              {formatTimeAgo(customer.lastOrderAt)}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--color-ink-600)]">
          {customer.city} · {customer.phoneNumber}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
          {customer.isLoyaltyMember ? (
            <StatusPill tone="accent">Loyalty</StatusPill>
          ) : null}
          <span className="font-semibold text-[var(--color-ink-800)]">
            {customer.orderCount} order{customer.orderCount === 1 ? "" : "s"}
          </span>
          {customer.loyaltyBalance > 0 ? (
            <span className="text-[var(--color-accent-700)]">
              {customer.loyaltyBalance.toLocaleString()} pts
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function CustomerCreateDrawer({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [city, setCity] = useState("");
  const [isLoyaltyMember, setIsLoyaltyMember] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await adminFetch("/api/customers", {
        method: "POST",
        json: {
          name,
          email: email || undefined,
          phoneNumber,
          city,
          isLoyaltyMember,
          notes: notes || undefined,
        },
      });
      toast.success("Customer created");
      onSaved();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to create customer");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title="Add customer"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="customer-create-form"
            isLoading={isSaving}
          >
            Create customer
          </Button>
        </div>
      }
    >
      <form id="customer-create-form" onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={FIELD_LIMITS.personName}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Phone"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            required
            maxLength={FIELD_LIMITS.phoneNumber}
          />
          <TextField
            label="City"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            required
            maxLength={FIELD_LIMITS.city}
          />
        </div>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={EMAIL_MAX_CHARS}
        />
        <Switch
          label="Loyalty member"
          checked={isLoyaltyMember}
          onCheckedChange={setIsLoyaltyMember}
        />
        <TextArea
          label="Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          maxLength={2_000}
        />
      </form>
    </Drawer>
  );
}
