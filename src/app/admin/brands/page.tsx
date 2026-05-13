import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { BrandsTable } from "@/components/admin/BrandsTable";
import { brands } from "@/data/brands";

export default function AdminBrandsPage() {
  return (
    <AdminShell>
      <PageTitle eyebrow="Catalog" title="Brands" />
      <section className="mt-8">
        <BrandsTable brands={brands} />
      </section>
    </AdminShell>
  );
}
