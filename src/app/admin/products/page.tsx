import { Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { ButtonLink } from "@/components/ui/Button";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { phones } from "@/data/phones";
import { brands } from "@/data/brands";

export default function AdminProductsPage() {
  const totalVariants = phones.reduce((sum, phone) => sum + phone.variants.length, 0);
  const inStockCount = phones.reduce(
    (sum, phone) => sum + phone.variants.filter((variant) => variant.isInStock).length,
    0,
  );
  const featuredCount = phones.filter((phone) => phone.isFeatured).length;

  return (
    <AdminShell>
      <PageTitle
        eyebrow="Catalog"
        title="Products"
        actions={
          <ButtonLink
            href="/admin/products/new"
            variant="primary"
            size="sm"
            leadingIcon={<Plus size={14} />}
          >
            Add product
          </ButtonLink>
        }
      />

      <section className="mt-10 grid gap-5 sm:grid-cols-3">
        <SummaryCard label="Models" value={phones.length} sub={`${featuredCount} featured`} />
        <SummaryCard
          label="Variants"
          value={totalVariants}
          sub={`${inStockCount} in stock`}
        />
        <SummaryCard
          label="Brands"
          value={brands.length}
          sub="across the catalog"
        />
      </section>

      <section className="mt-8">
        <ProductsTable phones={phones} brands={brands} />
      </section>
    </AdminShell>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  sub: string;
}

function SummaryCard({ label, value, sub }: SummaryCardProps) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
        {label}
      </p>
      <p className="mt-6 text-[30px] font-semibold leading-none tracking-[-0.025em] text-[var(--color-ink-900)]">
        {value}
      </p>
      <p className="mt-4 text-xs text-[var(--color-ink-500)]">{sub}</p>
    </div>
  );
}
