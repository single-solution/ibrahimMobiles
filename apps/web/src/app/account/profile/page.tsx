import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerProfile } from "@/app/account/_components/CustomerProfile";
import { auth } from "@/lib/auth";
import { getAccountCustomer } from "@/lib/core/account";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your name, contact details and saved addresses.",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "customer" || !session.user.customerId) {
    redirect("/account/sign-in?next=/account/profile");
  }
  const customer = await getAccountCustomer(session.user.customerId);
  if (!customer) {
    redirect("/account/sign-in?next=/account/profile");
  }
  return <CustomerProfile customer={customer} />;
}
