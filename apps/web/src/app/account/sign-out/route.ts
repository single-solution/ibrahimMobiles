import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { signOut } from "@/lib/auth";
import { CHAT_ANON_ID_COOKIE } from "@/lib/chat/anonymousSession";

const INQUIRY_THREAD_TOKEN_COOKIE = "inquiry_thread_token";

const isProduction = process.env.NODE_ENV === "production";

const ALL_STOREFRONT_AUTH_COOKIES = [
	// Custom storefront cookies configured in authConfig.ts
	"web.session-token",
	"__Secure-web.session-token",
	"web.csrf-token",
	"__Host-web.csrf-token",
	"web.callback-url",
	"__Secure-web.callback-url",
	// Standard Auth.js / NextAuth default cookie names
	"authjs.session-token",
	"__Secure-authjs.session-token",
	"next-auth.session-token",
	"__Secure-next-auth.session-token",
	"authjs.csrf-token",
	"__Host-authjs.csrf-token",
	"next-auth.csrf-token",
	"__Host-next-auth.csrf-token",
	"next-auth.callback-url",
	"__Secure-next-auth.callback-url",
	"authjs.callback-url",
	"__Secure-authjs.callback-url",
	// Anonymous chat and inquiry cookies
	CHAT_ANON_ID_COOKIE,
	INQUIRY_THREAD_TOKEN_COOKIE,
];

/**
 * Server-side sign-out endpoint.
 *
 * Two callers:
 *   - The explicit "Sign out" button (passes `?to=/`).
 *   - Account pages whose JWT is valid but whose `Customer` is gone.
 *
 * Clears NextAuth session cookies + httpOnly chat cookies so a
 * shared device cannot retain the previous visitor's session or conversations.
 */
export async function GET(request: Request) {
	const cookieStore = await cookies();

	// 1. Delete all matching cookies from server cookieStore
	const currentCookies = cookieStore.getAll();
	for (const c of currentCookies) {
		if (
			c.name.includes("session-token") ||
			c.name.includes("csrf-token") ||
			c.name.includes("callback-url") ||
			c.name.includes("authjs") ||
			c.name.includes("next-auth") ||
			c.name.includes("chat") ||
			c.name.includes("inquiry") ||
			ALL_STOREFRONT_AUTH_COOKIES.includes(c.name)
		) {
			cookieStore.delete(c.name);
		}
	}

	for (const name of ALL_STOREFRONT_AUTH_COOKIES) {
		cookieStore.delete(name);
	}

	const requested = new URL(request.url).searchParams.get("to");
	const redirectTo = requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : "/account/sign-in";

	try {
		await signOut({ redirectTo });
	} catch {
		// Auth.js may throw NEXT_REDIRECT internally, which is safe to swallow
	}

	const response = NextResponse.redirect(new URL(redirectTo, request.url));

	// 2. Explicitly write deletion Set-Cookie headers on response to force immediate client purge
	for (const name of ALL_STOREFRONT_AUTH_COOKIES) {
		response.cookies.set(name, "", {
			path: "/",
			maxAge: 0,
			expires: new Date(0),
			httpOnly: true,
			secure: isProduction,
			sameSite: "lax",
		});
	}

	return response;
}
