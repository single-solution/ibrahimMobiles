import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { InquiriesView } from "@/components/admin/InquiriesView";
import { inquiries } from "@/data/admin/inquiries";

export default function AdminInquiriesPage() {
  return (
    <AdminShell>
      <PageTitle eyebrow="Operations" title="Inquiries" />
      <section className="mt-8">
        <InquiriesView inquiries={inquiries} />
      </section>
    </AdminShell>
  );
}
