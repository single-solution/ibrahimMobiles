import { Types } from "mongoose";

import { getStoreSettings, Inquiry, connectDB } from "@store/db";
import {
  assistantReplyLooksUnsafe,
  customerChatSupportLabel,
  customerWantsHumanSupport,
  inquiryStatusPatchAfterMessage,
  logger,
  sanitizeAssistantReply,
  type InquiryThreadStatus,
} from "@store/shared";

import type { InquiryLean } from "@/lib/chat/serializer";
import {
  generateAssistantReply,
  isAssistantConfigured,
  type AssistantChatTurn,
} from "@/lib/chat/assistant/generateReply";
import { getChatSettings } from "@/lib/chat/chatSettings";

function historyFromInquiry(inquiry: InquiryLean): AssistantChatTurn[] {
  return inquiry.messages
    .filter((message) => message.author === "customer" || message.author === "assistant")
    .slice(-12)
    .map((message) => ({
      role: message.author === "customer" ? ("user" as const) : ("assistant" as const),
      content: message.body,
    }));
}

function fallbackReply(input: {
  siteName: string;
  supportPhone: string;
  wantsHuman: boolean;
}): string {
  if (input.wantsHuman) {
    return `Of course — I've flagged this chat for our team at ${input.siteName}. Someone will follow up here shortly. You can also reach us at ${input.supportPhone} during store hours.`;
  }
  return `Thanks for your message. I'm double-checking the latest details for you. If you'd like a teammate to jump in, just say "speak to someone" — we're at ${input.supportPhone} during store hours.`;
}

export async function maybeReplyWithAssistant(inquiry: InquiryLean): Promise<void> {
  const settings = await getChatSettings();
  if (!settings.assistantEnabled || !isAssistantConfigured(settings.assistantProvider)) {
    return;
  }

  const lastMessage = inquiry.messages[inquiry.messages.length - 1];
  if (!lastMessage || lastMessage.author !== "customer") {
    return;
  }

  const wantsHuman = customerWantsHumanSupport(lastMessage.body);
  const history = historyFromInquiry(inquiry).slice(0, -1);

  const supportLabel = customerChatSupportLabel(settings.assistantName);

  const generated = await generateAssistantReply({
    settings: {
      ...settings,
      assistantName: supportLabel,
    },
    customerMessage: lastMessage.body,
    subjectProductId: inquiry.subjectProductId?.toString(),
    subjectProductName: inquiry.subjectProductName,
    history,
  });

  let replyBody = generated?.reply?.trim() ?? "";
  if (!replyBody) {
    const store = await getStoreSettings();
    replyBody = fallbackReply({
      siteName: store.siteName,
      supportPhone: store.supportPhone,
      wantsHuman,
    });
  }
  replyBody = sanitizeAssistantReply(replyBody);

  if (assistantReplyLooksUnsafe(replyBody)) {
    const store = await getStoreSettings();
    replyBody = fallbackReply({
      siteName: store.siteName,
      supportPhone: store.supportPhone,
      wantsHuman,
    });
  }

  if (wantsHuman && !replyBody.toLowerCase().includes("team")) {
    replyBody = `${replyBody}\n\nI've also notified our team to follow up with you personally.`;
  }

  await connectDB();
  const now = new Date();
  const status = inquiry.status as InquiryThreadStatus;

  await Inquiry.updateOne(
    { _id: inquiry._id },
    {
      $push: {
        messages: {
          author: "assistant",
          authorName: supportLabel,
          body: replyBody,
          createdAt: now,
        },
      },
      $set: {
        lastMessageAt: now,
        lastMessagePreview: replyBody.slice(0, 280),
        lastMessageAuthor: "assistant",
        unreadByCustomer: (inquiry.unreadByCustomer ?? 0) + 1,
        ...inquiryStatusPatchAfterMessage(status, "assistant"),
      },
      ...(wantsHuman ? { $inc: { unreadByTeam: 1 } } : {}),
    },
  );

  logger.info(
    {
      inquiryId: inquiry._id.toString(),
      model: generated?.model ?? "fallback",
      provider: generated?.provider ?? settings.assistantProvider,
      wantsHuman,
    },
    "chat-assistant: replied",
  );
}

export async function reloadInquiry(inquiryId: Types.ObjectId): Promise<InquiryLean | null> {
  await connectDB();
  return Inquiry.findById(inquiryId).lean<InquiryLean>();
}
