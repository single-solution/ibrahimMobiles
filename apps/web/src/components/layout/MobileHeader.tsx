"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { BrandLockup } from "@/components/layout/BrandLockup";
import { classNames } from "@store/shared";
import { useStoreSettings } from "@/lib/core/storeSettingsContext";
import { useShopHref } from "@/lib/core/storefrontReferenceContext";

interface MobileHeaderProps {
	onOpenSearch: () => void;
}

export function MobileHeader({ onOpenSearch }: MobileHeaderProps) {
	const [isScrolled, setIsScrolled] = useState(false);
	const { siteName, brandLogoLight, brandLogoDark } = useStoreSettings();
	const catalogHomeHref = useShopHref();

	// Mirror the desktop header's frosted-on-scroll behaviour so the
	// mobile header dissolves into the hero gradient at the top of the
	// page and only firms up once content scrolls underneath it. Passive
	// listener so the scroll thread stays cheap.
	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 4);
		};
		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header
			data-scrolled={isScrolled ? "true" : "false"}
			/* `.scroll-header` (in globals.css) supplies the real
         `backdrop-filter` frosted-glass background. At the top of the
         page the header is near-transparent so the hero gradient shows
         through; on scroll it picks up a stronger tint, ink-100 border
         and shadow. The `border-b` class only declares the side; the
         colour is animated by `.scroll-header[data-scrolled]`. */
			className={classNames("scroll-header sticky top-0 z-[var(--z-sticky)] border-b safe-top md:hidden")}
			style={{ height: "var(--mobile-header-h)" }}
		>
			<div className="flex h-full items-center justify-between gap-2 px-3">
				<BrandLockup href={catalogHomeHref} siteName={siteName} logoUrl={brandLogoLight || brandLogoDark} tone="light" size="sm" />

				<div className="flex items-center gap-2">
					<a
						href="/deals"
						className="tap animate-interval-bounce inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--color-accent-500)]/60 bg-[var(--color-accent-500)]/20 px-2.5 text-[11px] font-bold text-[var(--color-ink-900)] shadow-[var(--shadow-xs)] active:bg-[var(--color-accent-500)]/40"
					>
						<span className="relative flex size-2">
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-accent-500)] opacity-75"></span>
							<span className="relative inline-flex size-2 rounded-full bg-[var(--color-accent-600)]"></span>
						</span>
						<span>Deals</span>
					</a>

					<button
						type="button"
						onClick={onOpenSearch}
						aria-label="Search products"
						className="tap inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--color-ink-200)]/80 bg-[var(--color-surface)]/80 px-3 text-[12px] font-semibold text-[var(--color-ink-900)] shadow-[var(--shadow-xs)] active:bg-[var(--color-accent-50)]/50"
					>
						<Search size={13} />
						<span>Search</span>
					</button>
				</div>
			</div>
		</header>
	);
}
