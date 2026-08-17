"use client";

import { Megaphone } from "lucide-react";
import { FormSection } from "@/components/forms/FormSection";
import { TextField } from "@/components/forms/TextField";
import { Switch } from "@/components/forms/Switch";
import { VideoUpload } from "@/components/shared/uploads";
import { SettingsTabHero, type SettingsHeroMetric } from "@/app/settings/_components/settingsWorkspaceUi";
import { SaveableSection } from "@/app/settings/_components/settingsSaveableSection";
import type { SectionProps } from "@/app/settings/_components/settingsSectionProps";

export function NoticesSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
	const hasDeliveryNote = draft.globalDeliveryNote.trim().length > 0;
	const isNoticeEnabled = draft.storeNoticeEnabled;
	const heroMetrics: SettingsHeroMetric[] = [
		{
			label: "Store notice",
			value: isNoticeEnabled ? "Active" : "Disabled",
			hint: isNoticeEnabled ? "Banner is showing on storefront" : "No global alerts active",
			tone: isNoticeEnabled ? "good" : "off",
			icon: Megaphone,
		},
	];
	return (
		<SaveableSection
			fields={[
				"globalDeliveryNote",
				"storeNoticeText",
				"storeNoticeEnabled",
				"heroHeadlineLine1",
				"heroHeadlineLine1Hidden",
				"heroHeadlineLine2",
				"heroHeadlineLine2Hidden",
				"heroFloatingProductsEnabled",
				"heroBadgeText",
				"heroBadgeHidden",
				"heroVideoWhoWeAreUrl",
				"heroVideoWhoWeAreHidden",
				"heroVideoHowWeDeliverUrl",
				"heroVideoHowWeDeliverHidden",
				"heroVideoButtonsHidden",
				"heroBackgroundVideoUrl",
				"heroBackgroundVideoOpacity",
			] as const}
			draft={draft}
			saved={saved}
			setField={setField}
			onSaved={onSaved}
			canUpdate={canUpdate}
			hero={<SettingsTabHero metrics={heroMetrics} />}
		>
			<FormSection
				title="Home Banner Headline & Text"
				description="Manage the primary animated hero lockup text and visibility on the storefront."
			>
				<div className="space-y-6">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-3 rounded-lg border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
							<TextField
								label="Headline line 1"
								value={draft.heroHeadlineLine1 ?? ""}
								onChange={(event) => setField("heroHeadlineLine1", event.target.value)}
								placeholder="e.g. Inspected"
								hint="First line (sweeping outline/fill effect)."
								disabled={!canUpdate || draft.heroHeadlineLine1Hidden}
							/>
							<Switch
								label="Hide line 1"
								description="Do not render the first headline line."
								checked={draft.heroHeadlineLine1Hidden ?? false}
								onCheckedChange={(checked) => setField("heroHeadlineLine1Hidden", checked)}
								disabled={!canUpdate}
							/>
						</div>

						<div className="space-y-3 rounded-lg border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
							<TextField
								label="Headline line 2"
								value={draft.heroHeadlineLine2 ?? ""}
								onChange={(event) => setField("heroHeadlineLine2", event.target.value)}
								placeholder="e.g. Trusted"
								hint="Second line (bold accent color)."
								disabled={!canUpdate || draft.heroHeadlineLine2Hidden}
							/>
							<Switch
								label="Hide line 2"
								description="Do not render the second headline line."
								checked={draft.heroHeadlineLine2Hidden ?? false}
								onCheckedChange={(checked) => setField("heroHeadlineLine2Hidden", checked)}
								disabled={!canUpdate}
							/>
						</div>
					</div>

					<div className="rounded-lg border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
						<Switch
							label="Floating animated products"
							description="Show animated trending product names floating on the left & right sides of the main headline."
							checked={draft.heroFloatingProductsEnabled ?? true}
							onCheckedChange={(checked) => setField("heroFloatingProductsEnabled", checked)}
							disabled={!canUpdate}
						/>
					</div>

					<div className="rounded-lg border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 space-y-3">
						<TextField
							label="Bottom scroll cue text"
							value={draft.heroBadgeText ?? ""}
							onChange={(event) => setField("heroBadgeText", event.target.value)}
							placeholder="e.g. We Are Different"
							hint="Text displayed above the bouncing scroll arrow."
							disabled={!canUpdate || draft.heroBadgeHidden}
						/>
						<Switch
							label="Hide bottom scroll cue"
							description="Hide the bottom badge and bouncing scroll arrow."
							checked={draft.heroBadgeHidden ?? false}
							onCheckedChange={(checked) => setField("heroBadgeHidden", checked)}
							disabled={!canUpdate}
						/>
					</div>
				</div>
			</FormSection>

			<FormSection
				title="Home Banner Background Video"
				description="Ambient, muted background video that plays seamlessly behind the main storefront hero banner."
			>
				<div className="space-y-4">
					<VideoUpload
						value={draft.heroBackgroundVideoUrl}
						onChange={(url) => setField("heroBackgroundVideoUrl", url)}
						subjectKind="hero-bg"
						label="Banner background video"
						hint="Upload a video file or paste a CloudFront / Cloudflare R2 / MP4 video link."
					/>
					<div className="max-w-xs">
						<TextField
							type="number"
							label="Video opacity (%)"
							value={String(draft.heroBackgroundVideoOpacity ?? 85)}
							onChange={(event) => {
								const val = Number(event.target.value);
								if (!isNaN(val)) {
									setField("heroBackgroundVideoOpacity", Math.min(100, Math.max(0, val)));
								}
							}}
							placeholder="85"
							hint="Sets how strong the video shows through (0 = invisible, 100 = full brightness)."
							disabled={!canUpdate}
						/>
					</div>
				</div>
			</FormSection>

			<FormSection
				title="Hero Video Action Buttons"
				description="Manage video preview links and visibility for the two interactive buttons on the hero banner."
			>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{/* Button 1: Who We Are */}
					<div className="space-y-3 rounded-lg border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
						<div className="font-semibold text-sm text-[var(--color-ink-900)]">Button 1: Store Tour & Live Inventory</div>
						<TextField
							label="Video URL"
							value={draft.heroVideoWhoWeAreUrl ?? ""}
							onChange={(event) => setField("heroVideoWhoWeAreUrl", event.target.value)}
							placeholder="https://... (Direct MP4 URL or video link)"
							hint="Opens in video preview modal."
							disabled={!canUpdate || draft.heroVideoWhoWeAreHidden}
						/>
						<Switch
							label="Hide button 1"
							description="Do not show 'Store Tour & Live Inventory' on the banner."
							checked={draft.heroVideoWhoWeAreHidden ?? false}
							onCheckedChange={(checked) => setField("heroVideoWhoWeAreHidden", checked)}
							disabled={!canUpdate}
						/>
					</div>

					{/* Button 2: How We Deliver */}
					<div className="space-y-3 rounded-lg border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
						<div className="font-semibold text-sm text-[var(--color-ink-900)]">Button 2: See How We Inspect & Ship</div>
						<TextField
							label="Video URL"
							value={draft.heroVideoHowWeDeliverUrl ?? ""}
							onChange={(event) => setField("heroVideoHowWeDeliverUrl", event.target.value)}
							placeholder="https://... (Direct MP4 URL or video link)"
							hint="Opens in video preview modal."
							disabled={!canUpdate || draft.heroVideoHowWeDeliverHidden}
						/>
						<Switch
							label="Hide button 2"
							description="Do not show 'See How We Inspect & Ship' on the banner."
							checked={draft.heroVideoHowWeDeliverHidden ?? false}
							onCheckedChange={(checked) => setField("heroVideoHowWeDeliverHidden", checked)}
							disabled={!canUpdate}
						/>
					</div>
				</div>
			</FormSection>

			<FormSection title="Delivery note" description="Global note displayed to customers on product pages and checkout regarding delivery times.">
				<TextField
					label="Global delivery note"
					value={draft.globalDeliveryNote}
					onChange={(event) => setField("globalDeliveryNote", event.target.value)}
					placeholder="e.g. 3 to 5 working days"
					hint="Appears on PDPs and at checkout."
					disabled={!canUpdate}
				/>
			</FormSection>

			<FormSection
				title="Store notice banner"
				description="A global banner displayed at the top of the storefront for important announcements like delayed deliveries or holidays."
			>
				<div className="space-y-4">
					<Switch
						label="Enable store notice"
						description="Show the banner on the storefront."
						checked={draft.storeNoticeEnabled}
						onCheckedChange={(checked) => setField("storeNoticeEnabled", checked)}
						disabled={!canUpdate}
					/>
					{draft.storeNoticeEnabled && (
						<TextField
							label="Notice text"
							value={draft.storeNoticeText}
							onChange={(event) => setField("storeNoticeText", event.target.value)}
							placeholder="e.g. Deliveries may be delayed by 2-3 days due to heavy rain."
							hint="Keep it brief. Displays prominently across the site."
							disabled={!canUpdate}
						/>
					)}
				</div>
			</FormSection>
		</SaveableSection>
	);
}
