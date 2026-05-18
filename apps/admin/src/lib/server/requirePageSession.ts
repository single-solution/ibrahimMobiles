import { redirect } from "next/navigation";
import { getVerifiedSession, type VerifiedUser } from "@/lib/permissions";

/**
 * Server-component guard for admin pages. If the visitor is unauthenticated
 * (or their backing user record was deactivated/deleted), redirects to the
 * login page with a `callbackUrl` so they land back on the page after sign-in.
 */
export async function requirePageSession(callbackPath: string): Promise<VerifiedUser> {
  const actor = await getVerifiedSession();
  if (!actor) {
    const callback = encodeURIComponent(callbackPath);
    redirect(`/login?callbackUrl=${callback}`);
  }
  return actor;
}
