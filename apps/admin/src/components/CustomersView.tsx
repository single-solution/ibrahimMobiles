"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Drawer } from "@/components/Drawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { Switch } from "@/components/forms/Switch";
import { useToast } from "@/components/Toast";
import { adminFetch } from "@/lib/adminApi";
import { getInitials } from "@/lib/initials";
import { FIELD_LIMITS, formatPrice } from "@store/shared";
import type { AdminCustomer, AdminCustomerSummary } from "@/types/admin";

/** RFC 5321 caps the local + domain parts at 320 chars combined. */
const EMAIL_MAX_CHARS = 320;

interface CustomersViewProps {
  customers: AdminCustomerSummary[];
}

type DrawerState =
  | { mode: "new" }
  | { mode: "edit"; customer: AdminCustomerSummary | AdminCustomer }
  | null;

export function CustomersView({ customers }: CustomersViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [toDelete, setToDelete] = useState<AdminCustomerSummary | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleDelete() {
    if (!toDelete) {
      return;
    }
    try {
      await adminFetch(`/api/customers/${toDelete.id}`, { method: "DELETE" });
      toast.warn(`"${toDelete.name}" deleted`);
      setToDelete(null);
      refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to delete customer");
    }
  }

  const columns: DataTableColumn<AdminCustomerSummary>[] = [
    {
      id: "customer",
      header: "Customer",
      cell: (customer) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-ink-700)]">
            {getInitials(customer.name)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">{customer.name}</p>
            <p className="truncate text-[11px] text-[var(--color-ink-500)]">
              {customer.city} · {customer.phoneNumber}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "email",
      header: "Email",
      hideOnMobile: true,
      cell: (customer) => (
        <span className="text-sm text-[var(--color-ink-700)]">{customer.email ?? "—"}</span>
      ),
    },
    {
      id: "orders",
      header: "Orders",
      hideOnMobile: true,
      align: "right",
      cell: (customer) => (
        <span className="text-sm font-medium text-[var(--color-ink-900)]">{customer.orderCount}</span>
      ),
    },
    {
      id: "spend",
      header: "Lifetime",
      align: "right",
      cell: (customer) => (
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">
          {customer.lifetimeSpendRupees > 0 ? formatPrice(customer.lifetimeSpendRupees) : "—"}
        </span>
      ),
    },
    {
      id: "loyalty",
      header: "Loyalty",
      hideOnMobile: true,
      cell: (customer) => (
        <span
          className={
            customer.isLoyaltyMember
              ? "text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-700)]"
              : "text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-400)]"
          }
        >
          {customer.isLoyaltyMember ? "Member" : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      width: "100px",
      cell: (customer) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-label="Edit customer"
            onClick={() => setDrawer({ mode: "edit", customer })}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            aria-label="Delete customer"
            onClick={() => setToDelete(customer)}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-rose-500 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        rows={customers}
        columns={columns}
        rowKey={(customer) => customer.id}
        searchAccessor={(customer) =>
          `${customer.name} ${customer.email ?? ""} ${customer.phoneNumber} ${customer.city}`
        }
        searchPlaceholder="Search customers…"
        toolbar={
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() => setDrawer({ mode: "new" })}
          >
            Add customer
          </Button>
        }
      />

      {drawer ? (
        <CustomerDrawer
          state={drawer}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            setDrawer(null);
            refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        isOpen={toDelete !== null}
        title="Delete customer?"
        message={
          <>
            Deleting <strong>{toDelete?.name}</strong> will remove their record permanently.
            Existing orders are preserved.
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

interface CustomerDrawerProps {
  state: { mode: "new" } | { mode: "edit"; customer: AdminCustomerSummary | AdminCustomer };
  onClose: () => void;
  onSaved: () => void;
}

function CustomerDrawer({ state, onClose, onSaved }: CustomerDrawerProps) {
  const toast = useToast();
  const isEdit = state.mode === "edit";
  const initial = isEdit ? state.customer : null;

  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initial?.phoneNumber ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [isLoyaltyMember, setIsLoyaltyMember] = useState(initial?.isLoyaltyMember ?? false);
  const initialNotes =
    initial && "notes" in initial && typeof initial.notes === "string" ? initial.notes : "";
  const [notes, setNotes] = useState<string>(initialNotes);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name,
        email: email || undefined,
        phoneNumber,
        city,
        isLoyaltyMember,
        notes: notes || undefined,
      };
      if (isEdit && initial) {
        await adminFetch(`/api/customers/${initial.id}`, {
          method: "PUT",
          json: payload,
        });
        toast.success("Customer updated");
      } else {
        await adminFetch(`/api/customers`, {
          method: "POST",
          json: payload,
        });
        toast.success("Customer created");
      }
      onSaved();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to save customer");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={isEdit ? "Edit customer" : "Add customer"}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="customer-form"
            isLoading={isSaving}
          >
            {isEdit ? "Save changes" : "Create customer"}
          </Button>
        </div>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={FIELD_LIMITS.personName}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Phone number"
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
          description="Enroll this customer in the loyalty program."
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
