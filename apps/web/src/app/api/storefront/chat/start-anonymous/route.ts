/**
 * POST /api/storefront/chat/start-anonymous
 *
 * Opens a guest preview thread — no name, phone, or first message required.
 * The browser gets an anonymous id cookie; up to CHAT_GUEST_MESSAGE_LIMIT
 * customer messages are allowed before sign-in.
 */

import { cookies } from "next/headers";

import { Inquiry, connectDB } from "@store/db";
import { badRequest, created, logger, serverError } from "@store/shared";
import { appendInquiryToGuestToken } from "@store/shared";

import { enforcePublicRateLimit } from "@/lib/api/publicRateLimit";
import { auth } from "@/lib/auth";
import { getChatSettings } from "@/lib/chat/chatSettings";
import {
  anonymousChatPhone,
  getOrCreateAnonymousChatId,
} from "@/lib/chat/anonymousSession";
import { toStorefrontThread } from "@/lib/chat/serializer";
import type { InquiryLean } from "@/lib/chat/serializer";

const COOKIE_NAME = "inquiry_thread_token";
const MAX_ANON_STARTS_PER_WINDOW = 5;

interface StartAnonymousBody {
  subjectProductId?: unknown;
  subjectProductName?: unknown;
}

export async function POST(request: Request) {
  const limited = enforcePublicRateLimit(request, {
    scope: "chat-start-anonymous",
    max: MAX_ANON_STARTS_PER_WINDOW,
  });
  if (limited) {
    return limited;
  }

  const settings = await getChatSettings();
  if (!settings.enabled) {
    return badRequest("Chat is currently disabled.");
  }

  let subjectProductName: string | undefined;
  try {
    const body = (await request.json()) as StartAnonymousBody;
    if (typeof body.subjectProductName === "string") {
      const trimmed = body.subjectProductName.trim();
      if (trimmed) {
        subjectProductName = trimmed.slice(0, 200);
      }
    }
  } catch {
    // empty body is fine
  }

  const session = await auth();
  if (session?.user?.role === "customer") {
    return badRequest("Signed-in customers should use their existing threads.");
  }

  await connectDB();
  try {
    const anonId = await getOrCreateAnonymousChatId();
    const phoneNumber = anonymousChatPhone(anonId);
    const now = new Date();

    const doc = await Inquiry.create({
      customerName: "Guest",
      phoneNumber,
      status: "open",
      lastMessageAt: now,
      lastMessagePreview: "",
      lastMessageAuthor: "customer",
      unreadByCustomer: 0,
      unreadByTeam: 0,
      subjectProductName,
      messages: [],
    });

    const lean = await Inquiry.findById(doc._id).lean<InquiryLean>();
    if (!lean) {
      return serverError("Thread vanished after creation.");
    }

    const thread = toStorefrontThread(lean);
    const cookieJar = await cookies();
    const existing = cookieJar.get(COOKIE_NAME)?.value;
    const reissued = await appendInquiryToGuestToken(
      existing,
      thread.id,
      phoneNumber,
      { days: settings.guestThreadTokenDays },
    );
    cookieJar.set({
      name: COOKIE_NAME,
      value: reissued.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: reissued.maxAgeSeconds,
    });

    return created(thread);
  } catch (error) {
    logger.error({ error }, "Failed to start anonymous chat thread");
    return serverError("Could not start chat. Please try again.");
  }
}
