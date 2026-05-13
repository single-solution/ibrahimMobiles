import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { ConversationsView } from "@/components/admin/ConversationsView";
import { conversations } from "@/data/admin/conversations";

export default function AdminConversationsPage() {
  return (
    <AdminShell>
      <PageTitle eyebrow="Operations" title="AI conversations" />
      <section className="mt-8">
        <ConversationsView conversations={conversations} />
      </section>
    </AdminShell>
  );
}
