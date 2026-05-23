/**
 * POST /api/storefront/chat/[id]/messages
 *
 * Customer sends a new message into an existing thread. Access is
 * gated by `resolveChatAccess` — only the signed-in owner or the
 * matching guest cookie can post.
 *
 * Side effects on the inquiry doc:
 *   - `messages` ← push new entry (`author: "customer"`).
 *   - `lastMessageAt` / `lastMessagePreview` / `lastMessageAuthor`
 *     refreshed so the admin inbox sort surfaces the activity.
 *   - `unreadByTeam` += 1 (admin acks reset this on read).
 *   - `unreadByCustomer` reset to 0 (we just round-tripped).
 *   - `status` flipped to `open` when it was `resolved` so the team
 *     sees it back in the active queue.
 */

import { Inquiry, connectDB } from "@store/db";
import {
  badRequest,
  CHAT_MESSAGE_BODY_MAX,
  created,
  isFieldError,
  logger,
  parseBody,
  serverError,
  SHORT_BURST_WINDOW_MS,
  validateMessageBody,
} from "@store/shared";

import { enforcePublicRateLimit } from "@/lib/api/publicRateLimit";
import { inquiryStatusPatchAfterMessage } from "@store/shared";

import { resolveChatAccess } from "@/lib/chat/access";
import { toStorefrontThread } from "@/lib/chat/serializer";
import type { InquiryLean } from "@/lib/chat/serializer";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface PostBody {
  body?: unknown;
}

const MAX_PER_WINDOW = 30;

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await resolveChatAccess(id);
  if (access instanceof Response) return access;

  const limited = enforcePublicRateLimit(request, {
    scope: "chat-message",
    identifier: access.inquiry.phoneNumber,
    max: MAX_PER_WINDOW,
    windowMs: SHORT_BURST_WINDOW_MS,
  });
  if (limited) return limited;

  const parsed = await parseBody<PostBody>(request);
  if (parsed instanceof Response) return parsed;

  const bodyResult = validateMessageBody(parsed.body);
  if (isFieldError(bodyResult)) {
    return badRequest(bodyResult.error);
  }
  if (bodyResult.length > CHAT_MESSAGE_BODY_MAX) {
    return badRequest("Message too long.");
  }

  await connectDB();
  try {
    const now = new Date();
    const inquiryId = access.inquiry._id;
    await Inquiry.updateOne(
      { _id: inquiryId },
      {
        $push: {
          messages: {
            author: "customer",
            authorName: access.inquiry.customerName,
            body: bodyResult,
            createdAt: now,
          },
        },
        $set: {
          lastMessageAt: now,
          lastMessagePreview: bodyResult.slice(0, 280),
          lastMessageAuthor: "customer",
          unreadByCustomer: 0,
          // `resolved → open` so the team gets notified again.
          ...inquiryStatusPatchAfterMessage(access.inquiry.status, "customer"),
        },
        $inc: { unreadByTeam: 1 },
      },
    );

    const refreshed = await Inquiry.findById(inquiryId).lean<InquiryLean>();
    if (!refreshed) {
      return serverError("Thread vanished while posting your message.");
    }
    return created(toStorefrontThread(refreshed));
  } catch (error) {
    logger.error({ error, inquiryId: id }, "Failed to post chat message");
    return serverError("Could not send your message. Please try again.");
  }
}
