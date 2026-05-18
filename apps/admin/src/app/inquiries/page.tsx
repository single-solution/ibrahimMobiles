import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { InquiriesView } from "@/components/InquiriesView";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import { connectDB, Inquiry } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { toInquiryResponse, type InquiryLean } from "@/lib/serializers/inquiry";

export const dynamic = "force-dynamic";

const RECENT_INQUIRIES_LIMIT = 200;
const INQUIRIES_COLUMN_COUNT = 6;
const INQUIRIES_ROW_COUNT = 12;

export default async function AdminInquiriesPage() {
  await requirePageSession("/inquiries");

  return (
    <AdminShell>
      <PageTitle eyebrow="Operations" title="Inquiries" />
      <section className="mt-8">
        <Suspense
          fallback={
            <AdminTableSkeleton
              columnCount={INQUIRIES_COLUMN_COUNT}
              rowCount={INQUIRIES_ROW_COUNT}
            />
          }
        >
          <InquiriesData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function InquiriesData() {
  await connectDB();
  const docs = await Inquiry.find()
    .sort({ receivedAt: -1 })
    .limit(RECENT_INQUIRIES_LIMIT)
    .lean<InquiryLean[]>();
  const inquiries = docs.map(toInquiryResponse);
  return <InquiriesView inquiries={inquiries} />;
}
