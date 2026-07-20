import NextAuth from "next-auth";
import { authConfig } from "@/lib/authConfig";

/**
 * Edge middleware for the storefront (Auth.js).
 * Keep the file named `middleware.ts` so Turbopack discovers the Edge entry.
 */
const { auth } = NextAuth(authConfig);

export { auth as middleware };

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|js|woff2?|ttf)).*)"],
};
