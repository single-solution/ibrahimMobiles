import { Types } from "mongoose";

import { getStoreSettings, Inquiry as InquiryModel, connectDB } from "@store/db";
import {
  assistantReplyLooksUnsafe,
  customerChatSupportLabel,
  customerWantsHumanSupport,
  inquiryStatusPatchAfterMessage,
  logger,
  normalizeChatAssistantProvider,
  splitAssistantReply,
  type InquiryThreadStatus,
} from "@store/shared";

import type { InquiryLean } from "@/lib/chat/serializer";
import {
  generateAssistantReply,
  isAssistantConfigured,
  resolveProviderApiKey,
  type AssistantChatTurn,
} from "@/lib/chat/assistant/generateReply";
import { getChatSettings } from "@/lib/chat/chatSettings";

/** Recent turns kept for context. Short on purpose to save tokens per call. */
const HISTORY_TURN_LIMIT = 8;

function historyFromInquiry(inquiry: InquiryLean): AssistantChatTurn[] {
  return inquiry.messages
    .filter((message) => message.author === "customer" || message.author === "assistant")
    .slice(-HISTORY_TURN_LIMIT)
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

export async function maybeReplyWithAssistant(
  inquiry: InquiryLean,
  options?: { verifiedCustomerId?: string },
): Promise<void> {
  const settings = await getChatSettings();
  const provider = normalizeChatAssistantProvider(settings.assistantProvider);
  const apiKey = resolveProviderApiKey(provider, settings);
  if (!settings.assistantEnabled || !isAssistantConfigured(provider, apiKey)) {
    return;
  }

  // Escalated to a human: stay quiet until an agent replies (which clears the
  // flag). The team owns the conversation now — the bot must not talk over it.
  if (inquiry.assistantMuted) {
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
    verifiedCustomerId: options?.verifiedCustomerId,
    history,
  });

  // The bot may reply in several short bubbles (texting style). Each is
  // sanitised on its own; if anything is empty or unsafe, fall back to a single
  // safe message rather than sending a partial/risky burst.
  const rawReply = generated?.reply?.trim() ?? "";
  let bubbles = rawReply ? splitAssistantReply(rawReply) : [];
  if (bubbles.length === 0 || bubbles.some(assistantReplyLooksUnsafe)) {
    const store = await getStoreSettings();
    bubbles = [
      fallbackReply({
        siteName: store.siteName,
        supportPhone: store.supportPhone,
        wantsHuman,
      }),
    ];
  }

  // The model decides genuine escalation (restricted ask, complaint, "get me a
  // human"). That flags the thread for the team AND mutes the bot. The keyword
  // signal is a softer net: notify the team but keep helping.
  const escalated = generated?.escalation?.requested ?? false;

  if (
    wantsHuman &&
    !escalated &&
    !bubbles.some((bubble) => bubble.toLowerCase().includes("team"))
  ) {
    bubbles.push("I've also notified our team to follow up with you personally.");
  }

  await connectDB();
  const now = new Date();
  const status = inquiry.status as InquiryThreadStatus;
  const flagTeam = escalated || wantsHuman;

  // Stagger createdAt by 1ms per bubble so ordering is deterministic.
  const messagesToPush = bubbles.map((body, index) => ({
    author: "assistant" as const,
    authorName: supportLabel,
    body,
    createdAt: new Date(now.getTime() + index),
  }));
  const lastBubble = bubbles[bubbles.length - 1];
  const lastCreatedAt = messagesToPush[messagesToPush.length - 1].createdAt;

  await InquiryModel.updateOne(
    { _id: inquiry._id },
    {
      $push: { messages: { $each: messagesToPush } },
      $set: {
        lastMessageAt: lastCreatedAt,
        lastMessagePreview: lastBubble.slice(0, 280),
        lastMessageAuthor: "assistant",
        unreadByCustomer: (inquiry.unreadByCustomer ?? 0) + bubbles.length,
        ...(escalated
          ? { status: "open" as InquiryThreadStatus, assistantMuted: true }
          : inquiryStatusPatchAfterMessage(status, "assistant")),
      },
      ...(flagTeam ? { $inc: { unreadByTeam: 1 } } : {}),
    },
  );

  logger.info(
    {
      inquiryId: inquiry._id.toString(),
      model: generated?.model ?? "fallback",
      provider: generated?.provider ?? settings.assistantProvider,
      wantsHuman,
      escalated,
    },
    "chat-assistant: replied",
  );
}

export async function reloadInquiry(inquiryId: Types.ObjectId): Promise<InquiryLean | null> {
  await connectDB();
  return InquiryModel.findById(inquiryId).lean<InquiryLean>();
}
