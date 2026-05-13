import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { OffersTable } from "@/components/admin/OffersTable";
import { offers } from "@/data/offers";

export default function AdminOffersPage() {
  return (
    <AdminShell>
      <PageTitle eyebrow="Catalog" title="Offers & deals" />
      <section className="mt-8">
        <OffersTable offers={offers} />
      </section>
    </AdminShell>
  );
}
