import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AccountMessagesView } from "@/app/account/_components/AccountMessagesView";

export const metadata: Metadata = {
  title: "Messages",
  description: "Your chat threads with our team.",
};

export default async function AccountMessagesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "customer") {
    redirect("/account/sign-in?next=/account/messages");
  }

  return <AccountMessagesView />;
}
