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
			fields={["globalDeliveryNote", "storeNoticeText", "storeNoticeEnabled", "heroVideoWhoWeAreUrl", "heroVideoHowWeDeliverUrl", "heroBackgroundVideoUrl"] as const}
			draft={draft}
			saved={saved}
			setField={setField}
			onSaved={onSaved}
			canUpdate={canUpdate}
			hero={<SettingsTabHero metrics={heroMetrics} />}
		>
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
				title="Home Banner Background Video"
				description="Ambient, muted background video that plays seamlessly behind the main storefront hero banner."
			>
				<div className="space-y-4">
					<VideoUpload
						value={draft.heroBackgroundVideoUrl}
						onChange={(url) => setField("heroBackgroundVideoUrl", url)}
						subjectKind="hero-bg"
						label="Banner background video"
						hint="Upload an MP4/WebM video or paste a video link."
					/>
					<TextField
						label="Or direct video URL"
						value={draft.heroBackgroundVideoUrl}
						onChange={(event) => setField("heroBackgroundVideoUrl", event.target.value)}
						placeholder="https://... (Direct MP4/WebM URL)"
						hint="Plays muted in the background with no controls for blazing fast load times."
						disabled={!canUpdate}
					/>
				</div>
			</FormSection>

			<FormSection
				title="Hero Video Previews"
				description="Manage video preview links for the interactive hero buttons on the storefront."
			>
				<div className="space-y-4">
					<TextField
						label="Who We Are & What We Do Video URL"
						value={draft.heroVideoWhoWeAreUrl}
						onChange={(event) => setField("heroVideoWhoWeAreUrl", event.target.value)}
						placeholder="https://... (Direct MP4 URL or video link)"
						hint="Opens in a video preview modal when customer clicks 'Who We Are'."
						disabled={!canUpdate}
					/>
					<TextField
						label="How We Get & Deliver Video URL"
						value={draft.heroVideoHowWeDeliverUrl}
						onChange={(event) => setField("heroVideoHowWeDeliverUrl", event.target.value)}
						placeholder="https://... (Direct MP4 URL or video link)"
						hint="Opens in a video preview modal when customer clicks 'How We Deliver'."
						disabled={!canUpdate}
					/>
				</div>
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
