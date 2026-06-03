/**
 * GET /api/chat/[id]
 *
 * Fetch a chat thread by id. Caller must satisfy `resolveChatAccess` —
 * either a signed-in customer who owns the thread or a guest with the
 * matching `inquiry_thread_token` cookie.
 *
 * Marks unseen agent messages as read by the customer (resets
 * `unreadByCustomer` to 0 and stamps each unread agent message's
 * `readByCustomerAt`). The next agent reply will re-increment the
 * counter on the admin side.
 */

import { Inquiry as InquiryModel, connectDB } from "@store/db";
import {
  isThreadUnchangedForPoll,
  notModified,
  ok,
  parsePollSince,
  threadPollEtag,
} from "@store/shared";

import { enforceChatPollRateLimit } from "@/lib/api/chatRateLimit";
import { resolveChatAccess } from "@/lib/chat/access";
import { toThread } from "@/lib/chat/serializer";
import type { InquiryLean } from "@/lib/chat/serializer";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: RouteContext) {
  const rateLimited = enforceChatPollRateLimit(request);
  if (rateLimited) {
    return rateLimited;
  }

  const { id } = await params;
  const access = await resolveChatAccess(id);
  if (access instanceof Response) return access;

  const url = new URL(request.url);
  const since = parsePollSince(url.searchParams.get("since"));
  const isPoll = since !== null;
  const ifNoneMatch = request.headers.get("If-None-Match");

  const inquiry = access.inquiry;
  const etag = threadPollEtag(inquiry.lastMessageAt);

  if (
    isPoll &&
    isThreadUnchangedForPoll({
      lastMessageAt: inquiry.lastMessageAt,
      updatedAt: inquiry.updatedAt,
      since,
      ifNoneMatch,
    })
  ) {
    return notModified(etag);
  }

  // Mark unread agent messages as read on full open — not on poll ticks.
  let toReturn: InquiryLean = inquiry;
  if (!isPoll && inquiry.unreadByCustomer > 0) {
    await connectDB();
    const now = new Date();
    await InquiryModel.updateOne(
      { _id: inquiry._id },
      {
        $set: {
          unreadByCustomer: 0,
          "messages.$[unread].readByCustomerAt": now,
        },
      },
      {
        arrayFilters: [
          { "unread.author": "agent", "unread.readByCustomerAt": { $exists: false } },
        ],
      },
    );
    const refreshed = await InquiryModel.findById(inquiry._id).lean<InquiryLean>();
    if (refreshed) toReturn = refreshed;
  }

  const response = ok(toThread(toReturn));
  response.headers.set("ETag", etag);
  return response;
}
