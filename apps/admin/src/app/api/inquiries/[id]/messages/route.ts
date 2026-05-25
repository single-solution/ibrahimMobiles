/**
 * POST /api/inquiries/[id]/messages
 *
 * Admin sends a reply into a chat thread. Permission-gated by
 * `inquiry_manage`. Reading the thread (`GET /api/inquiries/[id]`)
 * uses the lower-privilege session check; only replying / mutating
 * requires the explicit permission.
 *
 * Side effects:
 *   - Push new message with `author: "agent"` and the replying user's
 *     id + name for denormalised display.
 *   - `lastMessage*` updated; `unreadByCustomer` += 1; `unreadByTeam`
 *     reset to 0 since the team just touched the thread.
 *   - When the thread was `open`, flip to `awaiting-customer` so the
 *     inbox surface dimensions reflect "we're waiting on them now".
 *   - Auto-assign to the replying admin if `assignedToUserId` is unset
 *     (T8.10 hybrid claim — first-reply ownership).
 */

import { Inquiry, connectDB, handleMongoError } from "@store/db";
import {
  badRequest,
  CHAT_MESSAGE_BODY_MAX,
  created,
  isFieldError,
  isValidId,
  notFound,
  parseBody,
  validateMessageBody,
} from "@store/shared";

import { inquiryStatusPatchAfterMessage } from "@store/shared";

import { requireSession } from "@/lib/api/requireSession";
import { notifyOnNewMessage } from "@/lib/notifications/chatNotifications";
import { recordActivity } from "@/lib/services/activityLog";
import {
  toInquiryResponse,
  type InquiryLean,
} from "@/lib/serializers/inquiry";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface PostBody {
  body?: unknown;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("inquiry_reply");
  if (response) return response;

  const { id } = await params;
  if (!isValidId(id)) return badRequest("Invalid ID.");

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
    const inquiry = await Inquiry.findById(id).lean<InquiryLean>();
    if (!inquiry) return notFound("Inquiry not found");

    const now = new Date();
    const update: Record<string, unknown> = {
      $push: {
        messages: {
          author: "agent",
          authorName: actor.name,
          authorUserId: actor.id,
          body: bodyResult,
          createdAt: now,
        },
      },
      $set: {
        lastMessageAt: now,
        lastMessagePreview: bodyResult.slice(0, 280),
        lastMessageAuthor: "agent",
        unreadByTeam: 0,
        ...inquiryStatusPatchAfterMessage(inquiry.status, "team"),
        ...(inquiry.assignedToUserId ? {} : { assignedToUserId: actor.id }),
      },
      $inc: { unreadByCustomer: 1 },
    };

    await Inquiry.updateOne({ _id: id }, update);
    const refreshed = await Inquiry.findById(id).lean<InquiryLean>();
    if (!refreshed) return notFound("Inquiry not found");

    const label = refreshed.subjectProductName
      ? `${refreshed.customerName} · ${refreshed.subjectProductName}`
      : refreshed.customerName;
    await recordActivity({
      actor,
      action: "updated",
      resourceType: "inquiry",
      resourceId: id,
      resourceLabel: label,
      detail: "Replied",
    });
    const lastMessage = refreshed.messages[refreshed.messages.length - 1];
    if (lastMessage) {
      await notifyOnNewMessage(refreshed, {
        body: lastMessage.body,
        author: lastMessage.author,
      });
    }
    return created(toInquiryResponse(refreshed, { includeInternal: true }));
  } catch (error) {
    return handleMongoError(error);
  }
}
