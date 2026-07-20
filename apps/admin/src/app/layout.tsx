import type { Metadata, Viewport } from "next";
import { cache } from "react";
import { getStoreSettings } from "@store/db";
import { resolvePublicSiteUrl } from "@store/shared";

import { ToastProvider } from "@/components/ui/Toast";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { Shell } from "@/components/layout/Shell";
import { StoreSettingsProvider } from "@/lib/storeSettingsContext";
import { getActorPermissions, getVerifiedSession } from "@/lib/permissions";
import "./globals.css";

const getLayoutSettings = cache(() => getStoreSettings());

export async function generateMetadata(): Promise<Metadata> {
	const { siteName } = await getLayoutSettings();
	return {
		title: {
			default: `${siteName} · Admin`,
			template: `%s · ${siteName} Admin`,
		},
		robots: { index: false, follow: false },
	};
}

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
	themeColor: "#ffffff",
};

interface AdminRootLayoutProps {
	children: React.ReactNode;
}

export default async function AdminRootLayout({ children }: AdminRootLayoutProps) {
	const [settings, actor] = await Promise.all([getLayoutSettings(), getVerifiedSession()]);
	// Resolve on the server — client components cannot read STOREFRONT_BASE_URL / AUTH_URL.
	const clientSettings = {
		...settings,
		publicSiteUrl: resolvePublicSiteUrl(settings.publicSiteUrl),
	};
	const initialSession = actor
		? {
				id: actor.id,
				name: actor.name,
				permissions: getActorPermissions(actor),
			}
		: null;

	return (
		<html lang="en">
			<head>
				<script
					type="speculationrules"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							prefetch: [
								{
									source: "document",
									where: {
										and: [{ href_matches: "/*" }, { not: { href_matches: ["/login*", "/api/*"] } }],
									},
									eagerness: "conservative",
								},
							],
						}),
					}}
				/>
			</head>
			<body>
				<SessionProvider>
					<StoreSettingsProvider value={clientSettings}>
						<ToastProvider>
							<Shell initialSession={initialSession}>{children}</Shell>
						</ToastProvider>
					</StoreSettingsProvider>
				</SessionProvider>
			</body>
		</html>
	);
}
