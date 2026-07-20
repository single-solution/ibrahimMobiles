import NextAuth from "next-auth";
import { authConfig } from "@/lib/authConfig";

/**
 * Edge middleware for the admin app (Auth.js).
 *
 * Named `middleware.ts` (not `proxy.ts`): the OpenNext Cloudflare adapter only
 * builds Edge middleware — Next 16's Node-runtime `proxy.ts` is unsupported.
 */
const { auth } = NextAuth(authConfig);

export { auth as middleware };

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|manifest\\.json|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf)).*)"],
};
