/**
 * Storefront chat access guards.
 *
 * Resolves whether the current request is allowed to read / write a
 * given thread.
 *
 * Three permission scopes:
 *   1. **Customer session**: the inquiry's `customerId` matches the
 *      signed-in storefront customer.
 *   2. **Guest cookie**: the inquiry id is present in the verified
 *      `inquiry_thread_token` payload AND the cookie's phoneNumber
 *      matches the thread's anchor.
 *   3. **Neither**: 403 — we do not leak existence of unrelated threads.
 *
 * Returns the lean inquiry document on success, or a `Response` to
 * propagate back to the client.
 */

import { cookies } from "next/headers";
import type { Types } from "mongoose";

import { Inquiry, connectDB } from "@store/db";
import { badRequest, forbidden, isValidId, notFound, verifyGuestToken } from "@store/shared";

import { auth } from "@/lib/auth";
import type { InquiryLean } from "./serializer";

const COOKIE_NAME = "inquiry_thread_token";

export interface ChatAccess {
  inquiry: InquiryLean;
  /** "customer" if the storefront session matched, "guest" if the cookie did. */
  via: "customer" | "guest";
  customerId?: Types.ObjectId;
}

export async function resolveChatAccess(
  inquiryId: string,
): Promise<ChatAccess | Response> {
  if (!isValidId(inquiryId)) {
    return badRequest("Invalid thread id.");
  }
  await connectDB();
  const doc = await Inquiry.findById(inquiryId).lean<InquiryLean>();
  if (!doc) return notFound("Thread not found.");

  // Signed-in customer path.
  const session = await auth();
  if (
    session?.user?.role === "customer" &&
    session.user.customerId &&
    doc.customerId &&
    doc.customerId.toString() === session.user.customerId
  ) {
    return {
      inquiry: doc,
      via: "customer",
      customerId: doc.customerId,
    };
  }

  // Guest cookie path.
  const cookieJar = await cookies();
  const token = cookieJar.get(COOKIE_NAME)?.value;
  const payload = await verifyGuestToken(token);
  if (
    payload &&
    payload.inquiryIds.includes(doc._id.toString()) &&
    payload.phoneNumber === doc.phoneNumber
  ) {
    return { inquiry: doc, via: "guest" };
  }

  return forbidden("You don't have access to this thread.");
}
