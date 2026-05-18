"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Drawer } from "@/components/Drawer";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { SelectField } from "@/components/forms/SelectField";
import { useToast } from "@/components/Toast";
import { adminFetch } from "@/lib/adminApi";
import { FIELD_LIMITS, formatPrice } from "@store/shared";
import type { AdminLoyaltyAccount } from "@/types/admin";

interface LoyaltyViewProps {
  accounts: AdminLoyaltyAccount[];
  programmeRupeesPerPoint: number;
}

const KIND_OPTIONS = [
  { value: "earn", label: "Earn (add)" },
  { value: "bonus", label: "Bonus (add)" },
  { value: "redeem", label: "Redeem (subtract)" },
  { value: "expire", label: "Expire (subtract)" },
  { value: "adjust", label: "Adjust (signed)" },
];

/** Most recent transactions surfaced in the adjustment drawer. */
const RECENT_TRANSACTIONS_PREVIEW = 8;
/** Max characters accepted for the optional order-reference input. */
const ORDER_REF_INPUT_MAX = 32;

export function LoyaltyView({ accounts, programmeRupeesPerPoint }: LoyaltyViewProps) {
  const [active, setActive] = useState<AdminLoyaltyAccount | null>(null);

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const totalLifetime = accounts.reduce((sum, account) => sum + account.lifetimeEarned, 0);

  const columns: DataTableColumn<AdminLoyaltyAccount>[] = [
    {
      id: "customer",
      header: "Member",
      cell: (account) => (
        <p className="text-sm font-semibold text-[var(--color-ink-900)]">{account.customerName}</p>
      ),
    },
    {
      id: "balance",
      header: "Balance",
      align: "right",
      cell: (account) => (
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">
          {account.balance.toLocaleString()} pts
        </span>
      ),
    },
    {
      id: "lifetime",
      header: "Lifetime earned",
      align: "right",
      hideOnMobile: true,
      cell: (account) => (
        <span className="text-sm text-[var(--color-ink-700)]">
          {account.lifetimeEarned.toLocaleString()} pts
        </span>
      ),
    },
    {
      id: "value",
      header: "Cash value",
      align: "right",
      hideOnMobile: true,
      cell: (account) => (
        <span className="text-sm text-[var(--color-ink-700)]">
          {formatPrice(account.balance * programmeRupeesPerPoint)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (account) => (
        <Button
          variant="outline"
          size="sm"
          leadingIcon={<Plus size={12} />}
          onClick={() => setActive(account)}
        >
          Adjust
        </Button>
      ),
    },
  ];

  return (
    <>
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Members"
          value={accounts.length.toLocaleString()}
          sub={`${accounts.filter((account) => account.balance > 0).length} with balance`}
        />
        <SummaryCard
          label="Outstanding balance"
          value={`${totalBalance.toLocaleString()} pts`}
          sub={formatPrice(totalBalance * programmeRupeesPerPoint)}
        />
        <SummaryCard
          label="Lifetime earned"
          value={`${totalLifetime.toLocaleString()} pts`}
          sub={`${formatPrice(totalLifetime * programmeRupeesPerPoint)} given`}
        />
      </section>

      <DataTable
        rows={accounts}
        columns={columns}
        rowKey={(account) => account.id}
        searchAccessor={(account) => account.customerName}
        searchPlaceholder="Search members…"
      />

      {active ? (
        <AdjustDrawer
          account={active}
          onClose={() => setActive(null)}
        />
      ) : null}
    </>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {label}
      </p>
      <p className="mt-2 text-[22px] font-semibold leading-none tracking-tight text-[var(--color-ink-900)]">
        {value}
      </p>
      <p className="mt-2 text-xs text-[var(--color-ink-500)]">{sub}</p>
    </div>
  );
}

interface AdjustDrawerProps {
  account: AdminLoyaltyAccount;
  onClose: () => void;
}

function AdjustDrawer({ account, onClose }: AdjustDrawerProps) {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState<string>("earn");
  const [amount, setAmount] = useState<number>(100);
  const [reason, setReason] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await adminFetch(`/api/loyalty/${account.customerId}/transactions`, {
        method: "POST",
        json: { kind, amount, reason, orderRef: orderRef || undefined },
      });
      toast.success("Loyalty balance updated");
      onClose();
      router.refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to adjust loyalty");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={`Adjust ${account.customerName}'s balance`}
      description={`Current balance: ${account.balance.toLocaleString()} pts`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="loyalty-form"
            isLoading={isSaving}
          >
            Apply adjustment
          </Button>
        </div>
      }
    >
      <form id="loyalty-form" onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Kind"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          options={KIND_OPTIONS}
        />
        <TextField
          label="Amount (points)"
          type="number"
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value) || 0)}
          required
          hint="Positive amount; sign is derived from the chosen kind. For 'adjust', use negative for deductions."
        />
        <TextField
          label="Order reference (optional)"
          value={orderRef}
          onChange={(event) => setOrderRef(event.target.value)}
          placeholder="IM-2026-0042"
          maxLength={ORDER_REF_INPUT_MAX}
        />
        <TextArea
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          required
          maxLength={FIELD_LIMITS.shortText}
          placeholder="e.g. Goodwill credit for delayed dispatch"
        />

        {account.transactions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Recent activity
            </p>
            <ul className="space-y-1.5">
              {account.transactions.slice(-RECENT_TRANSACTIONS_PREVIEW).reverse().map((transaction) => (
                <li
                  key={transaction.id}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs"
                >
                  <p className="font-semibold text-[var(--color-ink-900)]">
                    {transaction.kind} · {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount} pts
                  </p>
                  <p className="text-[10px] text-[var(--color-ink-500)]">
                    {new Date(transaction.occurredAt).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[var(--color-ink-700)]">{transaction.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>
    </Drawer>
  );
}
