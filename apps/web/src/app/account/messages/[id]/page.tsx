import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountMessagesView } from "@/components/account/AccountMessagesView";
import { auth } from "@/lib/auth";

interface AccountMessageDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Message thread",
  description: "Continue your chat with our team.",
};

export default async function AccountMessageDetailPage({
  params,
}: AccountMessageDetailPageProps) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!session?.user || session.user.role !== "customer") {
    redirect(`/account/sign-in?next=${encodeURIComponent(`/account/messages/${id}`)}`);
  }

  return <AccountMessagesView initialThreadId={id} />;
}
