import { Attribute as AttributeModel, Category, connectDB, Grade as GradeModel } from "@store/db";
import {
	asString,
	buildAttributeGlossaryAiPrompt,
	buildAttributeGlossaryDescription,
	buildAttributeGlossaryTitle,
	buildGradeGlossaryAiPrompt,
	buildGradeGlossaryDescription,
	buildGradeGlossaryTitle,
	callAssistantCompletion,
	composeAttributeGlossarySeo,
	composeGradeGlossarySeo,
	isAssistantProviderConfigured,
	logger,
	parseAttributeGlossaryAiResponse,
	parseGradeGlossaryAiResponse,
	resolveAssistantModelFromSettings,
	type SeoMeta,
} from "@store/shared";

import { loadChatSettings } from "@/lib/chat/loadChatSettings";
import { loadSeoSettings } from "@/lib/seo/loadSeoSettings";

function resolveAssistantApiKey(settings: Awaited<ReturnType<typeof loadChatSettings>>): { provider: "openai" | "google" | "anthropic"; apiKey: string } | null {
	const provider = settings.assistantProvider;
	const apiKey =
		provider === "google"
			? settings.providerApiKeyGoogle
			: provider === "anthropic"
				? settings.providerApiKeyAnthropic
				: settings.providerApiKeyOpenai;
	if (!isAssistantProviderConfigured(provider, apiKey)) {
		return null;
	}
	return { provider, apiKey };
}

function mergeAiIntoSeo(
	existing: SeoMeta | undefined,
	ai: { title: string; description: string; faqs: SeoMeta["faqs"] },
	formula: { title: string; description: string },
	meta: { modelId: string },
): SeoMeta {
	const merged: SeoMeta = { ...(existing ?? {}) };
	let wroteAi = false;

	if (!existing?.title?.trim()) {
		merged.title = ai.title || formula.title;
		if (merged.title) {
			wroteAi = true;
		}
	}
	if (!existing?.description?.trim()) {
		merged.description = ai.description || formula.description;
		if (merged.description) {
			wroteAi = true;
		}
	}
	if (ai.faqs && ai.faqs.length > 0) {
		merged.faqs = ai.faqs;
		wroteAi = true;
	}

	if (wroteAi) {
		merged.aiGeneratedAt = new Date().toISOString();
		merged.aiModelId = meta.modelId;
	}

	return merged;
}

export interface RegenerateGlossarySeoResult {
	ok: boolean;
	seo: SeoMeta;
	source: "ai" | "formula";
	message?: string;
}

async function loadCategoryLabel(categorySlug: string): Promise<string> {
	const category = await Category.findOne({ slug: categorySlug }).select({ label: 1 }).lean<{ label: string }>();
	return category?.label ?? "";
}

export async function regenerateGradeSeo(gradeId: string): Promise<RegenerateGlossarySeoResult | null> {
	await connectDB();

	const doc = await GradeModel.findById(gradeId).lean();
	if (!doc) {
		return null;
	}

	const categorySlug = asString(doc.categorySlug);
	const [categoryLabel, seoSettings, chatSettings] = await Promise.all([loadCategoryLabel(categorySlug), loadSeoSettings(), loadChatSettings()]);
	const storeName = seoSettings.seoStoreName.trim() || seoSettings.siteName.trim() || "Ibrahim Mobiles";
	const grade = {
		categorySlug,
		slug: asString(doc.slug),
		label: asString(doc.label),
		notes: asString(doc.notes),
	};
	const formulaTitle = buildGradeGlossaryTitle(grade.label, storeName);
	const formulaDescription = buildGradeGlossaryDescription({
		gradeLabel: grade.label,
		gradeNotes: grade.notes,
		categoryLabel,
		storeName,
	});
	const formulaResolved = composeGradeGlossarySeo({
		grade,
		categoryLabel,
		settings: seoSettings,
	});

	const assistant = resolveAssistantApiKey(chatSettings);
	if (!assistant) {
		const seo: SeoMeta = {
			...(doc.seo ?? {}),
			title: doc.seo?.title?.trim() || formulaTitle,
			description: doc.seo?.description?.trim() || formulaDescription,
		};
		await GradeModel.findByIdAndUpdate(gradeId, { $set: { seo } });
		return { ok: true, seo, source: "formula", message: "Chat API not configured; formula SEO saved." };
	}

	const provider = assistant.provider;
	const model = resolveAssistantModelFromSettings(provider, chatSettings);
	const prompt = buildGradeGlossaryAiPrompt({
		gradeLabel: grade.label,
		gradeNotes: grade.notes,
		categoryLabel,
		storeName,
		formulaTitle,
		formulaDescription,
	});

	try {
		const completion = await callAssistantCompletion({
			provider,
			model,
			apiKey: assistant.apiKey,
			messages: [
				{
					role: "system",
					content: "You output strict JSON for glossary SEO metadata. Never invent product specifications.",
				},
				{ role: "user", content: prompt },
			],
			temperature: 0.3,
			maxTokens: 900,
		});
		const parsed = completion?.reply ? parseGradeGlossaryAiResponse(completion.reply) : null;
		const seo = parsed
			? mergeAiIntoSeo(doc.seo, parsed, { title: formulaTitle, description: formulaDescription }, { modelId: `${provider}:${completion?.model ?? model}` })
			: {
					...(doc.seo ?? {}),
					title: doc.seo?.title?.trim() || formulaTitle,
					description: doc.seo?.description?.trim() || formulaDescription,
				};

		await GradeModel.findByIdAndUpdate(gradeId, { $set: { seo } });
		return {
			ok: true,
			seo,
			source: parsed ? "ai" : "formula",
			message: parsed ? undefined : "AI response invalid; formula SEO saved.",
		};
	} catch (error) {
		logger.warn({ error, gradeId }, "grade glossary SEO AI failed; saving formula");
		const seo: SeoMeta = {
			...(doc.seo ?? {}),
			title: doc.seo?.title?.trim() || formulaResolved.title,
			description: doc.seo?.description?.trim() || formulaResolved.description,
		};
		await GradeModel.findByIdAndUpdate(gradeId, { $set: { seo } });
		return { ok: true, seo, source: "formula", message: "AI failed; formula SEO saved." };
	}
}

export async function regenerateAttributeSeo(attributeId: string): Promise<RegenerateGlossarySeoResult | null> {
	await connectDB();

	const doc = await AttributeModel.findById(attributeId).lean();
	if (!doc) {
		return null;
	}

	const categorySlug = asString(doc.categorySlug);
	const [categoryLabel, seoSettings, chatSettings] = await Promise.all([loadCategoryLabel(categorySlug), loadSeoSettings(), loadChatSettings()]);
	const storeName = seoSettings.seoStoreName.trim() || seoSettings.siteName.trim() || "Ibrahim Mobiles";
	const optionLabels = (doc.options ?? []).map((option) => asString(option.label)).filter(Boolean);
	const attribute = {
		categorySlug,
		slug: asString(doc.slug),
		label: asString(doc.label),
		unit: asString(doc.unit) || undefined,
		optionLabels,
	};
	const formulaTitle = buildAttributeGlossaryTitle(attribute.label, storeName);
	const formulaDescription = buildAttributeGlossaryDescription({
		attributeLabel: attribute.label,
		optionLabels,
		unit: attribute.unit,
		categoryLabel,
		storeName,
	});
	const formulaResolved = composeAttributeGlossarySeo({
		attribute,
		categoryLabel,
		settings: seoSettings,
	});

	const assistant = resolveAssistantApiKey(chatSettings);
	if (!assistant) {
		const seo: SeoMeta = {
			...(doc.seo ?? {}),
			title: doc.seo?.title?.trim() || formulaTitle,
			description: doc.seo?.description?.trim() || formulaDescription,
		};
		await AttributeModel.findByIdAndUpdate(attributeId, { $set: { seo } });
		return { ok: true, seo, source: "formula", message: "Chat API not configured; formula SEO saved." };
	}

	const provider = assistant.provider;
	const model = resolveAssistantModelFromSettings(provider, chatSettings);
	const prompt = buildAttributeGlossaryAiPrompt({
		attributeLabel: attribute.label,
		unit: attribute.unit,
		optionLabels,
		categoryLabel,
		storeName,
		formulaTitle,
		formulaDescription,
	});

	try {
		const completion = await callAssistantCompletion({
			provider,
			model,
			apiKey: assistant.apiKey,
			messages: [
				{
					role: "system",
					content: "You output strict JSON for glossary SEO metadata. Never invent product specifications.",
				},
				{ role: "user", content: prompt },
			],
			temperature: 0.3,
			maxTokens: 900,
		});
		const parsed = completion?.reply ? parseAttributeGlossaryAiResponse(completion.reply) : null;
		const seo = parsed
			? mergeAiIntoSeo(doc.seo, parsed, { title: formulaTitle, description: formulaDescription }, { modelId: `${provider}:${completion?.model ?? model}` })
			: {
					...(doc.seo ?? {}),
					title: doc.seo?.title?.trim() || formulaTitle,
					description: doc.seo?.description?.trim() || formulaDescription,
				};

		await AttributeModel.findByIdAndUpdate(attributeId, { $set: { seo } });
		return {
			ok: true,
			seo,
			source: parsed ? "ai" : "formula",
			message: parsed ? undefined : "AI response invalid; formula SEO saved.",
		};
	} catch (error) {
		logger.warn({ error, attributeId }, "attribute glossary SEO AI failed; saving formula");
		const seo: SeoMeta = {
			...(doc.seo ?? {}),
			title: doc.seo?.title?.trim() || formulaResolved.title,
			description: doc.seo?.description?.trim() || formulaResolved.description,
		};
		await AttributeModel.findByIdAndUpdate(attributeId, { $set: { seo } });
		return { ok: true, seo, source: "formula", message: "AI failed; formula SEO saved." };
	}
}
