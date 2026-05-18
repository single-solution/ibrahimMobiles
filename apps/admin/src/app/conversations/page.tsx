import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { ConversationsView } from "@/components/ConversationsView";
import { Skeleton } from "@/components/ui/Skeleton";
import { connectDB, Conversation } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import {
  summariseConversation,
  type ConversationLean,
} from "@/lib/serializers/conversation";

export const dynamic = "force-dynamic";

const RECENT_CONVERSATIONS_LIMIT = 200;
const CONVERSATION_FALLBACK_ROWS = 8;

export default async function AdminConversationsPage() {
  await requirePageSession("/conversations");

  return (
    <AdminShell>
      <PageTitle
        eyebrow="Operations"
        title="AI conversations"
        description="Live chat threads from the storefront, WhatsApp and other channels."
      />
      <section className="mt-8">
        <Suspense fallback={<ConversationsFallback />}>
          <ConversationsData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function ConversationsData() {
  await connectDB();
  const docs = await Conversation.find()
    .sort({ lastMessageAt: -1 })
    .limit(RECENT_CONVERSATIONS_LIMIT)
    .lean<ConversationLean[]>();
  const conversations = docs.map(summariseConversation);
  return <ConversationsView conversations={conversations} />;
}

function ConversationsFallback() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
      <ul className="divide-y divide-[var(--color-ink-100)]">
        {Array.from({ length: CONVERSATION_FALLBACK_ROWS }).map((_, index) => (
          <li key={index} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton shape="circle" className="size-9" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Skeleton shape="text" className="h-3.5 w-32" />
                <Skeleton shape="text" className="h-3 w-12" />
              </div>
              <Skeleton shape="text" className="h-3 w-3/4" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
