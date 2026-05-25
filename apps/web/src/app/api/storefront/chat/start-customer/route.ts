/**
 * POST /api/storefront/chat/start-customer
 *
 * Opens an empty thread for a signed-in customer — no form fields required.
 * The first message is sent via POST .../messages.
 */

import { Types } from "mongoose";

import { Customer, Inquiry, connectDB } from "@store/db";
import { badRequest, created, logger, serverError } from "@store/shared";

import { enforceSameOrigin } from "@/lib/api/sameOrigin";
import { auth } from "@/lib/auth";
import { getChatSettings } from "@/lib/chat/chatSettings";
import { toStorefrontThread } from "@/lib/chat/serializer";
import type { InquiryLean } from "@/lib/chat/serializer";

export async function POST(request: Request) {
  const csrf = enforceSameOrigin(request);
  if (csrf) {
    return csrf;
  }

  const settings = await getChatSettings();
  if (!settings.enabled) {
    return badRequest("Chat is currently disabled.");
  }

  const session = await auth();
  if (
    session?.user?.role !== "customer" ||
    !session.user.customerId ||
    !Types.ObjectId.isValid(session.user.customerId)
  ) {
    return badRequest("Sign in to start a conversation.");
  }

  await connectDB();
  const customer = await Customer.findById(session.user.customerId)
    .select({ name: 1, phoneNumber: 1 })
    .lean<{ name: string; phoneNumber: string }>();
  if (!customer) {
    return badRequest("Customer account not found.");
  }

  try {
    const now = new Date();
    const doc = await Inquiry.create({
      customerName: customer.name,
      phoneNumber: customer.phoneNumber,
      customerId: new Types.ObjectId(session.user.customerId),
      status: "open",
      lastMessageAt: now,
      lastMessagePreview: "",
      lastMessageAuthor: "customer",
      unreadByCustomer: 0,
      unreadByTeam: 0,
      messages: [],
    });

    const lean = await Inquiry.findById(doc._id).lean<InquiryLean>();
    if (!lean) {
      return serverError("Thread vanished after creation.");
    }

    return created(toStorefrontThread(lean));
  } catch (error) {
    logger.error({ error }, "Failed to start customer chat thread");
    return serverError("Could not open chat. Please try again.");
  }
}
