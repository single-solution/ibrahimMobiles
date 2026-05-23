import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AccountMessagesView } from "@/components/account/AccountMessagesView";

export const metadata: Metadata = {
  title: "Messages",
  description: "Your chat threads with our team.",
};

export default async function AccountMessagesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "customer") {
    redirect("/account/sign-in?next=/account/messages");
  }

  return (
    <div className="app-page max-w-3xl">
      <header className="app-section">
        <h1 className="text-xl font-semibold text-[var(--color-ink-900)]">Messages</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-500)]">
          Conversations you&apos;ve started with our team.
        </p>
      </header>
      <AccountMessagesView />
    </div>
  );
}
