import { Types } from "mongoose";

import { getStoreSettings, Inquiry as InquiryModel, connectDB, getIntegrationSettings, resolveInquiryStaffNotifyTargets } from "@store/db";
import {
	assistantReplyLooksUnsafe,
	assistantReplyMatchesLanguage,
	customerAskedAboutDeals,
	customerChatSupportLabel,
	customerMessageIsGreetingOnly,
	customerWantsHumanSupport,
	detectCustomerMessageLanguage,
	inquiryStatusPatchAfterMessage,
	logger,
	normalizeChatAssistantProvider,
	splitAssistantReply,
	type CustomerMessageLanguage,
	type InquiryThreadStatus,
} from "@store/shared";
import { notifyStaffOnInquiryEscalation } from "@store/shared/server";

import type { InquiryLean } from "@/lib/chat/serializer";
import { generateAssistantReply, isAssistantConfigured, resolveProviderApiKey, type AssistantChatTurn } from "@/lib/chat/assistant/generateReply";
import { formatDeals } from "@/lib/chat/assistant/storeContext";
import { getChatSettings } from "@/lib/chat/chatSettings";
import { getActiveOffersCached } from "@/lib/core/cached";

/** Recent turns kept for context. Short on purpose to save tokens per call. */
const HISTORY_TURN_LIMIT = 10;

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

async function buildFallbackReply(input: {
	customerMessage: string;
	siteName: string;
	supportPhone: string;
	wantsHuman: boolean;
	requiredLanguage: CustomerMessageLanguage;
}): Promise<string> {
	const { requiredLanguage } = input;

	if (input.wantsHuman) {
		const contactLine = input.supportPhone.trim()
			? requiredLanguage === "roman_urdu" || requiredLanguage === "urdu_script"
				? ` Store hours mein ${input.supportPhone} par bhi reach kar sakte hain.`
				: ` You can also reach us at ${input.supportPhone} during store hours.`
			: "";
		if (requiredLanguage === "roman_urdu" || requiredLanguage === "urdu_script") {
			return `Bilkul — main ne ${input.siteName} ki team ko is chat par flag kar diya hai. Koi jald yahan reply karega.${contactLine}`;
		}
		return `Of course — I have flagged this chat for our team at ${input.siteName}. Someone will follow up here shortly.${contactLine}`;
	}

	if (customerAskedAboutDeals(input.customerMessage)) {
		const offers = await getActiveOffersCached();
		const dealsText = formatDeals(offers);
		const firstToken = input.customerMessage.trim().split(/\s+/)[0]?.replace(/[!?.]+$/, "") ?? "";
		const greetingPrefix = /^(hi|hello|hey|salam|aoa|assalam)$/i.test(firstToken)
			? requiredLanguage === "roman_urdu" || requiredLanguage === "urdu_script"
				? "Assalam o alaikum! "
				: "Hi! "
			: "";
		if (dealsText) {
			if (requiredLanguage === "roman_urdu" || requiredLanguage === "urdu_script") {
				return `${greetingPrefix}Abhi ye active deals hain:\n${dealsText}\n\nKisi par detail chahiye ya budget bata dein, main match kar dun ga?`;
			}
			return `${greetingPrefix}Here are our active deals right now:\n${dealsText}\n\nWant details on any of these, or should I find something in your budget?`;
		}
		if (requiredLanguage === "roman_urdu" || requiredLanguage === "urdu_script") {
			return `${greetingPrefix}Abhi store-wide promo nahi chal raha, lekin site par live prices aur grades hain. Budget ya phone bata dein, main best in-stock option dhoond dun ga.`;
		}
		return `${greetingPrefix}We do not have a store-wide promotion running right now, but prices and grades are live on the site. Tell me your budget or the phone you want and I will find the best in-stock option.`;
	}

	if (customerMessageIsGreetingOnly(input.customerMessage)) {
		if (requiredLanguage === "roman_urdu" || requiredLanguage === "urdu_script") {
			return `Assalam o alaikum! ${input.siteName} mein khush amdeed — budget ya jo phone chahiye bata dein, main best in-stock deal warranty ke sath dhoond dun ga. Promos ke bare mein bhi pooch sakte hain.`;
		}
		return `Hi! Welcome to ${input.siteName} — tell me your budget or the phone you have in mind and I will find you the best in-stock deal with warranty details. Ask about current promos anytime.`;
	}

	if (requiredLanguage === "roman_urdu" || requiredLanguage === "urdu_script") {
		return `Shukriya — jo phone ya budget hai bata dein, main live price aur stock share kar dun ga. Ya "kisi se baat karni hai" likh dein, teammate join kar lega.`;
	}
	return `Thanks for your message. Tell me the phone or budget you are looking for and I will share live prices and stock, or say "speak to someone" if you want a teammate on this chat.`;
}

export async function maybeReplyWithAssistant(inquiry: InquiryLean, options?: { verifiedCustomerId?: string }): Promise<void> {
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
		const escalatedAt = inquiry.escalatedAt ? new Date(inquiry.escalatedAt).getTime() : 0;
		if (!escalatedAt || Date.now() - escalatedAt < ESCALATION_GRACE_MS) {
			return;
		}
	}

	const lastMessage = inquiry.messages[inquiry.messages.length - 1];
	if (!lastMessage || lastMessage.author !== "customer") {
		return;
	}

	const wantsHuman = customerWantsHumanSupport(lastMessage.body);
	const requiredLanguage = detectCustomerMessageLanguage(lastMessage.body);
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
	const languageMismatch = bubbles.some((bubble) => !assistantReplyMatchesLanguage(bubble, requiredLanguage));
	const fallbackReason = !rawReply
		? "provider_empty_or_failed"
		: languageMismatch
			? "language_mismatch"
			: bubbles.some(assistantReplyLooksUnsafe)
				? "unsafe_reply"
				: "empty_after_split";
	if (bubbles.length === 0 || bubbles.some(assistantReplyLooksUnsafe) || languageMismatch) {
		const store = await getStoreSettings();
		bubbles = [
			await buildFallbackReply({
				customerMessage: lastMessage.body,
				siteName: store.siteName,
				supportPhone: store.supportPhone,
				wantsHuman,
				requiredLanguage,
			}),
		];
		logger.warn(
			{
				inquiryId: inquiry._id.toString(),
				reason: fallbackReason,
				customerPreview: lastMessage.body.slice(0, 120),
			},
			"chat-assistant: used fallback reply",
		);
	}

	// The model decides genuine escalation (restricted ask, complaint, "get me a
	// human"). That flags the thread for the team AND mutes the bot. The keyword
	// signal is a softer net: notify the team but keep helping.
	const escalated = generated?.escalation?.requested ?? false;
	const needsHumanHandoff = escalated || wantsHuman;

	// Skip the extra "notified our team" line while already escalated — the
	// prompt already reassures the senior is looped in.
	if (wantsHuman && !needsHumanHandoff && !awaitingHuman && !bubbles.some((bubble) => bubble.toLowerCase().includes("team"))) {
		bubbles.push(
			requiredLanguage === "roman_urdu" || requiredLanguage === "urdu_script"
				? "Main ne team ko bhi notify kar diya hai ke wo personally follow up karein."
				: "I've also notified our team to follow up with you personally.",
		);
	}

	await connectDB();
	const now = new Date();
	const status = inquiry.status as InquiryThreadStatus;
	const flagTeam = needsHumanHandoff || awaitingHuman;

	// Escalation state: handoff mutes the bot and stamps the time;
	// an awaiting-human reply keeps it muted (the senior still owns the issue);
	// otherwise the normal status patch applies.
	const escalationPatch: Record<string, unknown> = needsHumanHandoff
		? {
				status: "open" as InquiryThreadStatus,
				assistantMuted: true,
				assistantMuteReason: "escalation",
				assistantMutedAt: inquiry.assistantMutedAt ?? now,
				assistantMutedByUserId: null,
				escalatedAt: inquiry.escalatedAt ?? now,
			}
		: awaitingHuman
			? {
					status: "open" as InquiryThreadStatus,
					assistantMuted: true,
				}
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

	if (needsHumanHandoff && !inquiry.escalatedAt) {
		const [integration, store] = await Promise.all([getIntegrationSettings(), getStoreSettings()]);
		const { notifyEmails, notifyWhatsAppPhones } = await resolveInquiryStaffNotifyTargets(inquiry, integration, store);
		if (notifyEmails.length || notifyWhatsAppPhones.length) {
			const preview = bubbles[0] ?? "Customer requested a human agent.";
			void notifyStaffOnInquiryEscalation({
				inquiryId: inquiry._id.toString(),
				customerName: inquiry.customerName ?? "Guest",
				phoneNumber: inquiry.phoneNumber,
				messagePreview: preview,
				notifyEmails,
				notifyWhatsAppPhones,
				whatsappStaffNotifyTemplate: integration.whatsappStaffNotifyTemplate.trim() || undefined,
				siteName: store.siteName,
				adminSiteUrl: integration.adminSiteUrl.trim() || undefined,
			});
		}
	}

	logger.info(
		{
			inquiryId: inquiry._id.toString(),
			model: generated?.model ?? "fallback",
			provider: generated?.provider ?? settings.assistantProvider,
			wantsHuman,
			escalated: needsHumanHandoff,
		},
		"chat-assistant: replied",
	);
}

export async function reloadInquiry(inquiryId: Types.ObjectId): Promise<InquiryLean | null> {
	await connectDB();
	return InquiryModel.findById(inquiryId).lean<InquiryLean>();
}
