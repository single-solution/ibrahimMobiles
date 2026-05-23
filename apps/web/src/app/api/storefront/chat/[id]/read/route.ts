import { Inquiry, connectDB } from "@store/db";
import { noContent } from "@store/shared";

import { enforceChatPollRateLimit } from "@/lib/api/chatRateLimit";
import { resolveChatAccess } from "@/lib/chat/access";
import type { InquiryLean } from "@/lib/chat/serializer";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: RouteContext) {
  const rateLimited = enforceChatPollRateLimit(request);
  if (rateLimited) {
    return rateLimited;
  }

  const { id } = await params;
  const access = await resolveChatAccess(id);
  if (access instanceof Response) return access;

  const inquiry = access.inquiry;
  if (inquiry.unreadByCustomer <= 0) {
    return noContent();
  }

  await connectDB();
  const now = new Date();
  await Inquiry.updateOne(
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

  return noContent();
}
