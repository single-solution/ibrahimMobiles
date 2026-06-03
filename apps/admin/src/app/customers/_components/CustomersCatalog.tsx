"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserCircle } from "lucide-react";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusPill } from "@/components/shared/StatusPill";
import { useToast } from "@/components/ui/Toast";
import {
  WorkspaceEmptyPane,
  WorkspaceFilterChip,
  WorkspaceFrame,
  WorkspaceReadOnlyBanner,
  WorkspacePaneHeader,
  WorkspaceSearchField,
  WorkspaceSidebarNavItem,
} from "@/components/shared/workspaceUi";
import { CustomerDetailPanel } from "./CustomerDetailPanel";
import { apiFetch } from "@/lib/api";
import { useAdminPermissions } from "@/lib/permissionsContext";
import { useNavigationTransition } from "@/lib/navigation/navigationProgress";
import { getInitials } from "@/lib/initials";
import { classNames, formatPrice, formatTimeAgo } from "@store/shared";
import type { AdminCustomerSummary } from "@/types/models";

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
  const { startNavigation } = useNavigationTransition();
  const toast = useToast();
  const { can } = useAdminPermissions();

  const [segment, setSegment] = useState<SegmentFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
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
      const url = query ? `/customers?${query}` : "/customers";
      startNavigation(() => router.replace(url, { scroll: false }));
    },
    [router, searchParams, startNavigation],
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
      await apiFetch(`/api/customers/${toDelete.id}`, { method: "DELETE" });
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
        {!canManage ? (
          <WorkspaceReadOnlyBanner message="Read-only — you can view customers but not edit profiles, addresses, or loyalty." />
        ) : null}
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
              iconElement={<UserCircle size={15} />}
              title="Customers"
              subtitle={`${filteredCustomers.length} shown (recent 500) · website sign-up · ${formatPrice(stats.totalBalance * programmeRupeesPerPoint)} loyalty`}
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
                <li className="px-4 py-8 text-center text-xs leading-relaxed text-[var(--color-ink-500)]">
                  {searchQuery.trim()
                    ? "No customers match your search."
                    : segment === "all"
                      ? "No customers yet. Records appear when someone signs in with OTP or checks out on the storefront."
                      : "No customers in this segment."}
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
                iconElement={<UserCircle size={22} />}
                title="Select a customer"
                description="Customers register on the website (OTP sign-in or checkout). Use this workspace to view orders, adjust loyalty, and add internal notes."
              />
            )}
          </section>
        </div>
      </WorkspaceFrame>

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
