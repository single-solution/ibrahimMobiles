import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { TaxonomiesView } from "@/components/admin/TaxonomiesView";
import { gradeDescriptors } from "@/data/grades";
import { stockTypeDescriptors } from "@/data/stockTypes";

export default function AdminTaxonomiesPage() {
  return (
    <AdminShell>
      <PageTitle eyebrow="Catalog" title="Taxonomies" />
      <section className="mt-8">
        <TaxonomiesView grades={gradeDescriptors} stockTypes={stockTypeDescriptors} />
      </section>
    </AdminShell>
  );
}
