import { requireSession } from "@/lib/api/requireSession";
import {
  connectDB,
  Customer,
  Inquiry,
  Order,
  SIGNED_IN_INQUIRY_FILTER,
} from "@store/db";
import { ok } from "@store/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const { actor, response } = await requireSession();
  if (response) {
    return response;
  }

  await connectDB();

  const [ordersUnread, customersUnread, inquiriesUnread] = await Promise.all([
    Order.countDocuments({ seenByAdminIds: { $ne: actor.id } }),
    Customer.countDocuments({ seenByAdminIds: { $ne: actor.id } }),
    Inquiry.countDocuments({
      ...SIGNED_IN_INQUIRY_FILTER,
      unreadByTeam: { $gt: 0 },
    }),
  ]);

  return ok({
    ordersUnread,
    customersUnread,
    inquiriesUnread,
  });
}
