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

/**
 * Grace window after escalation during which the bot stays silent so the
 * senior teammate gets first crack at the conversation. If no agent has
 * replied within this window (the thread is still muted) and the customer
 * keeps messaging, the bot resumes with reassurance-only help so they are
 * never left hanging.
 */
const ESCALATION_GRACE_MS = 3 * 60_000;

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

  // Escalated to a human: stay quiet during the grace window so the senior
  // gets first crack. If still muted past the grace window (no agent reply
  // yet) and the customer keeps messaging, the bot resumes with
  // reassurance-only help so they are never left hanging.
  const awaitingHuman = inquiry.assistantMuted === true;
  if (awaitingHuman) {
    const escalatedAt = inquiry.escalatedAt
      ? new Date(inquiry.escalatedAt).getTime()
      : 0;
    if (!escalatedAt || Date.now() - escalatedAt < ESCALATION_GRACE_MS) {
      return;
    }
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
    awaitingHuman,
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

  // Skip the extra "notified our team" line while already escalated — the
  // prompt already reassures the senior is looped in.
  if (
    wantsHuman &&
    !escalated &&
    !awaitingHuman &&
    !bubbles.some((bubble) => bubble.toLowerCase().includes("team"))
  ) {
    bubbles.push("I've also notified our team to follow up with you personally.");
  }

  await connectDB();
  const now = new Date();
  const status = inquiry.status as InquiryThreadStatus;
  const flagTeam = escalated || wantsHuman || awaitingHuman;

  // Escalation state: a fresh escalation mutes the bot and stamps the time;
  // an awaiting-human reply keeps it muted (the senior still owns the issue);
  // otherwise the normal status patch applies.
  const escalationPatch: Record<string, unknown> = escalated
    ? {
        status: "open" as InquiryThreadStatus,
        assistantMuted: true,
        escalatedAt: inquiry.escalatedAt ?? now,
      }
    : awaitingHuman
      ? { status: "open" as InquiryThreadStatus, assistantMuted: true }
      : inquiryStatusPatchAfterMessage(status, "assistant");

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
        ...escalationPatch,
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
