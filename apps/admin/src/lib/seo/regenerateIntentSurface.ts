import {
	aggregateIntentSurfaceComboStats,
	Brand,
	Category,
	connectDB,
	Grade as GradeModel,
	SeoSurface,
} from "@store/db";
import {
	buildIntentSurfaceAiPrompt,
	buildIntentSurfaceCanonicalQuery,
	buildIntentSurfaceFormulaDescription,
	buildIntentSurfaceFormulaHeadline,
	buildIntentSurfaceFormulaIntro,
	buildIntentSurfaceFormulaTitle,
	callAssistantCompletion,
	isAssistantProviderConfigured,
	logger,
	parseIntentSurfaceAiResponse,
	passesIntentSurfaceEligibility,
	resolveAssistantModelFromSettings,
	type IntentSurfaceKey,
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

export interface RegenerateIntentSurfaceResult {
	ok: boolean;
	isIndexable: boolean;
	source: "ai" | "formula";
	message?: string;
}

export interface RegenerateIntentSurfaceOptions {
	/** Re-run AI/formula copy when grade labels change; staff overrides are preserved. */
	forceRegenerateCopy?: boolean;
}

export async function regenerateIntentSurface(
	key: IntentSurfaceKey,
	categoryDescription?: string,
	options: RegenerateIntentSurfaceOptions = {},
): Promise<RegenerateIntentSurfaceResult> {
	await connectDB();

	const [stats, category, brand, grade, existing, seoSettings, chatSettings] = await Promise.all([
		aggregateIntentSurfaceComboStats(key),
		Category.findOne({ slug: key.categorySlug }).select({ label: 1, description: 1 }).lean<{ label: string; description: string }>(),
		Brand.findOne({ slug: key.brandSlug, categorySlugs: key.categorySlug }).select({ name: 1 }).lean<{ name: string }>(),
		GradeModel.findOne({ categorySlug: key.categorySlug, slug: key.gradeSlug, isActive: true }).select({ label: 1 }).lean<{ label: string }>(),
		SeoSurface.findOne({
			categorySlug: key.categorySlug,
			brandSlug: key.brandSlug,
			gradeSlug: key.gradeSlug,
		}).lean(),
		loadSeoSettings(),
		loadChatSettings(),
	]);

	const storeName = seoSettings.seoStoreName.trim() || seoSettings.siteName.trim() || "Ibrahim Mobiles";
	const categoryLabel = category?.label ?? key.categorySlug;
	const brandName = brand?.name ?? key.brandSlug;
	const gradeLabel = grade?.label ?? key.gradeSlug;
	const comboStats = stats ?? {
		...key,
		productCount: 0,
		inStockVariantCount: 0,
	};

	const formulaTitle = buildIntentSurfaceFormulaTitle({ brandName, categoryLabel, gradeLabel, storeName });
	const formulaDescription = buildIntentSurfaceFormulaDescription({
		brandName,
		categoryLabel,
		gradeLabel,
		productCount: comboStats.productCount,
		inStockVariantCount: comboStats.inStockVariantCount,
		minPriceRupees: comboStats.minPriceRupees,
		maxPriceRupees: comboStats.maxPriceRupees,
		storeName,
	});
	const formulaHeadline = buildIntentSurfaceFormulaHeadline({ brandName, categoryLabel, gradeLabel });
	const formulaIntro = buildIntentSurfaceFormulaIntro({
		brandName,
		categoryLabel,
		gradeLabel,
		productCount: comboStats.productCount,
		storeName,
	});
	const categoryCopy = categoryDescription?.trim() || category?.description?.trim() || "";
	const hasCopy = Boolean(formulaTitle && formulaDescription && (formulaIntro.trim() || categoryCopy));
	const isIndexable = passesIntentSurfaceEligibility(comboStats, hasCopy);
	const canonicalQuery = buildIntentSurfaceCanonicalQuery(key.brandSlug, key.gradeSlug);
	const hasTitleOverride = Boolean(existing?.titleOverride?.trim());
	const hasDescriptionOverride = Boolean(existing?.descriptionOverride?.trim());
	const hasHeadlineOverride = Boolean(existing?.headlineOverride?.trim());
	const hasIntroOverride = Boolean(existing?.introOverride?.trim());

	const persist = async (payload: {
		title: string;
		description: string;
		headline: string;
		intro: string;
		source: "ai" | "formula";
		aiGeneratedAt?: string;
		aiModelId?: string;
	}) => {
		await SeoSurface.findOneAndUpdate(
			{
				categorySlug: key.categorySlug,
				brandSlug: key.brandSlug,
				gradeSlug: key.gradeSlug,
			},
			{
				$set: {
					...(hasTitleOverride ? {} : { title: payload.title }),
					...(hasDescriptionOverride ? {} : { description: payload.description }),
					...(hasHeadlineOverride ? {} : { headline: payload.headline }),
					...(hasIntroOverride ? {} : { intro: payload.intro }),
					canonicalQuery,
					inStockVariantCount: comboStats.inStockVariantCount,
					productCount: comboStats.productCount,
					minPriceRupees: comboStats.minPriceRupees,
					maxPriceRupees: comboStats.maxPriceRupees,
					isIndexable,
					lastStockCheckAt: new Date(),
					aiGeneratedAt: payload.aiGeneratedAt,
					aiModelId: payload.aiModelId,
				},
			},
			{ upsert: true, new: true },
		);
		return { ok: true, isIndexable, source: payload.source };
	};

	if (!isIndexable) {
		await persist({
			title: formulaTitle,
			description: formulaDescription,
			headline: formulaHeadline,
			intro: formulaIntro || categoryCopy,
			source: "formula",
		});
		return { ok: true, isIndexable: false, source: "formula", message: "Combo below index threshold; stored with noindex." };
	}

	const shouldRunAi =
		options.forceRegenerateCopy
			? !hasTitleOverride && !hasDescriptionOverride && !hasHeadlineOverride && !hasIntroOverride
			: !existing?.aiGeneratedAt;
	const assistant = shouldRunAi ? resolveAssistantApiKey(chatSettings) : null;

	if (!assistant) {
		await persist({
			title: formulaTitle,
			description: formulaDescription,
			headline: formulaHeadline,
			intro: formulaIntro || categoryCopy,
			source: "formula",
		});
		return {
			ok: true,
			isIndexable,
			source: "formula",
			message: assistant === null && shouldRunAi ? "No AI provider configured; formula copy kept." : undefined,
		};
	}

	const provider = assistant.provider;
	const model = resolveAssistantModelFromSettings(provider, chatSettings);
	const prompt = buildIntentSurfaceAiPrompt({
		brandName,
		categoryLabel,
		gradeLabel,
		storeName,
		stats: comboStats,
		formulaTitle,
		formulaDescription,
		formulaHeadline,
		formulaIntro,
	});

	try {
		const completion = await callAssistantCompletion({
			provider,
			model,
			apiKey: assistant.apiKey,
			messages: [
				{
					role: "system",
					content: "You output strict JSON for intent landing page copy. Never invent product specifications.",
				},
				{ role: "user", content: prompt },
			],
			temperature: 0.3,
			maxTokens: 700,
		});
		const parsed = completion?.reply ? parseIntentSurfaceAiResponse(completion.reply) : null;
		if (!parsed) {
			logger.warn({ key, provider, model }, "intent-surface: AI generation failed; keeping formula fallback");
			await persist({
				title: formulaTitle,
				description: formulaDescription,
				headline: formulaHeadline,
				intro: formulaIntro || categoryCopy,
				source: "formula",
			});
			return { ok: false, isIndexable, source: "formula", message: "AI generation failed; formula copy kept." };
		}

		await persist({
			title: parsed.title ?? formulaTitle,
			description: parsed.description ?? formulaDescription,
			headline: parsed.headline,
			intro: parsed.intro,
			source: "ai",
			aiGeneratedAt: new Date().toISOString(),
			aiModelId: `${provider}:${completion?.model ?? model}`,
		});
		return { ok: true, isIndexable, source: "ai" };
	} catch (error) {
		logger.warn({ error, key }, "intent-surface: AI generation threw; keeping formula fallback");
		await persist({
			title: formulaTitle,
			description: formulaDescription,
			headline: formulaHeadline,
			intro: formulaIntro || categoryCopy,
			source: "formula",
		});
		return { ok: true, isIndexable, source: "formula", message: "AI failed; formula copy kept." };
	}
}
