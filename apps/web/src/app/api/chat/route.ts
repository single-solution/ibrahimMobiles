/**
 * GET /api/chat
 *
 * Returns the chat threads visible to the current caller plus the
 * minimum settings the widget needs to operate. Two visibility modes:
 *
 *   1. Signed-in customer: every thread bound to their `customerId`.
 *   2. Guest cookie: the threads listed in the verified
 *      `inquiry_thread_token` payload (filtered server-side so an
 *      expired/forged cookie can't enumerate other threads).
 *
 * The widget polls this endpoint on focus / blur cadence (settings).
 */

import { cookies } from "next/headers";
import { Types } from "mongoose";

import { Inquiry as InquiryModel, connectDB } from "@store/db";
import { ok, verifyGuestToken } from "@store/shared";

import { enforceChatPollRateLimit } from "@/lib/api/chatRateLimit";
import { auth } from "@/lib/auth";
import { getChatSettings } from "@/lib/chat/chatSettings";
import { summariseThread } from "@/lib/chat/serializer";
import type { InquiryLean } from "@/lib/chat/serializer";

const COOKIE_NAME = "inquiry_thread_token";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimited = enforceChatPollRateLimit(request);
  if (rateLimited) {
    return rateLimited;
  }

  const settings = await getChatSettings();
  const session = await auth();
  const isSignedInCustomer =
    session?.user?.role === "customer" &&
    Boolean(session?.user?.customerId) &&
    Types.ObjectId.isValid(session?.user?.customerId ?? "");

  if (!settings.enabled) {
    return ok({ enabled: false, threads: [], settings, isSignedInCustomer });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("summary") === "1") {
    await connectDB();
    const filters: Record<string, unknown>[] = [];
    if (isSignedInCustomer && session?.user?.customerId) {
      filters.push({ customerId: new Types.ObjectId(session.user.customerId) });
    }
    const cookieJar = await cookies();
    const token = cookieJar.get(COOKIE_NAME)?.value;
    const payload = await verifyGuestToken(token);
    if (payload && payload.inquiryIds.length > 0) {
      const ids = payload.inquiryIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
      if (ids.length > 0) {
        filters.push({ _id: { $in: ids }, phoneNumber: payload.phoneNumber });
      }
    }
    if (filters.length === 0) {
      return ok({ unreadByCustomer: 0 });
    }
    const agg = await InquiryModel.aggregate<{ total: number }>([
      { $match: filters.length === 1 ? filters[0] : { $or: filters } },
      { $group: { _id: null, total: { $sum: "$unreadByCustomer" } } },
    ]);
    return ok({ unreadByCustomer: agg[0]?.total ?? 0 });
  }

  await connectDB();

  const filters: Record<string, unknown>[] = [];

  if (isSignedInCustomer && session?.user?.customerId) {
    filters.push({ customerId: new Types.ObjectId(session.user.customerId) });
  }

  const cookieJar = await cookies();
  const token = cookieJar.get(COOKIE_NAME)?.value;
  const payload = await verifyGuestToken(token);
  if (payload && payload.inquiryIds.length > 0) {
    const ids = payload.inquiryIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (ids.length > 0) {
      filters.push({
        _id: { $in: ids },
        phoneNumber: payload.phoneNumber,
      });
    }
  }

  if (filters.length === 0) {
    return ok({ enabled: true, threads: [], settings, isSignedInCustomer });
  }

  const docs = await InquiryModel.find(filters.length === 1 ? filters[0] : { $or: filters })
    .sort({ lastMessageAt: -1 })
    .limit(30)
    .lean<InquiryLean[]>();

  return ok({
    enabled: true,
    threads: docs.map(summariseThread),
    settings,
    isSignedInCustomer,
  });
}
