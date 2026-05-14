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

      <section className="mt-3 grid grid-cols-3 gap-2 md:mt-10 md:gap-5">
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

      <section className="mt-3 md:mt-8">
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
    <div className="rounded-[12px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3 md:rounded-[var(--radius-lg)] md:p-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-500)] md:text-[11px] md:font-semibold md:tracking-[0.18em]">
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)] md:mt-6 md:text-[30px] md:leading-none md:tracking-[-0.025em]">
        {value}
      </p>
      <p className="mt-1 line-clamp-1 text-[10.5px] text-[var(--color-ink-500)] md:mt-4 md:text-xs">{sub}</p>
    </div>
  );
}
