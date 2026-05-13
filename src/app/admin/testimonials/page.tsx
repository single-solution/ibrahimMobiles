import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { TestimonialsTable } from "@/components/admin/TestimonialsTable";
import { testimonials } from "@/data/testimonials";

export default function AdminTestimonialsPage() {
  return (
    <AdminShell>
      <PageTitle eyebrow="Catalog" title="Testimonials" />
      <section className="mt-8">
        <TestimonialsTable testimonials={testimonials} />
      </section>
    </AdminShell>
  );
}
