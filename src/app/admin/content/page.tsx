import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { ContentEditor } from "@/components/admin/ContentEditor";
import {
  aboutContentBlocks,
  faqEntries,
  footerContentBlocks,
  homeContentBlocks,
} from "@/data/admin/adminContent";

export default function AdminContentPage() {
  return (
    <AdminShell>
      <PageTitle eyebrow="Site" title="Content blocks" />
      <section className="mt-8">
        <ContentEditor
          homeBlocks={homeContentBlocks}
          aboutBlocks={aboutContentBlocks}
          footerBlocks={footerContentBlocks}
          faqEntries={faqEntries}
        />
      </section>
    </AdminShell>
  );
}
