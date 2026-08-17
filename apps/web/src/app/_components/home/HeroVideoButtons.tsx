"use client";

import { useState } from "react";
import { Play, Sparkles, Truck } from "lucide-react";
import { HeroVideoModal } from "@/app/_components/home/HeroVideoModal";
import { MagneticHover } from "@/components/shared/motion/MagneticHover";

interface HeroVideoButtonsProps {
	whoWeAreUrl?: string;
	whoWeAreHidden?: boolean;
	howWeDeliverUrl?: string;
	howWeDeliverHidden?: boolean;
}

export function HeroVideoButtons({
	whoWeAreUrl = "",
	whoWeAreHidden = false,
	howWeDeliverUrl = "",
	howWeDeliverHidden = false,
}: HeroVideoButtonsProps) {
	const [activeModal, setActiveModal] = useState<{ isOpen: boolean; title: string; videoUrl: string }>({
		isOpen: false,
		title: "",
		videoUrl: "",
	});

	const openModal = (title: string, videoUrl: string) => {
		setActiveModal({ isOpen: true, title, videoUrl });
	};

	const closeModal = () => {
		setActiveModal((prev) => ({ ...prev, isOpen: false }));
	};

	const showButton1 = !whoWeAreHidden;
	const showButton2 = !howWeDeliverHidden;

	if (!showButton1 && !showButton2) {
		return null;
	}

	return (
		<>
			<div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 md:gap-3.5">
				{/* Button 1: Store Tour & Live Inventory */}
				{showButton1 ? (
					<MagneticHover fieldSelector="[data-magnetic-field]" strength={0.18} maxOffset={20}>
						<button
							type="button"
							onClick={() => openModal("Store Tour & Live Inventory", whoWeAreUrl)}
							className="group relative inline-flex items-center gap-2.5 rounded-full bg-[var(--color-accent-500)] px-4.5 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-900)] shadow-[0_6px_22px_-6px_color-mix(in_srgb,var(--color-accent-500)_60%,transparent)] transition-all duration-300 hover:scale-105 hover:bg-[var(--color-accent-600)] active:scale-95 animate-hero-btn-pulse"
						>
							{/* Live Pinging Status Dot */}
							<span className="relative flex h-2 w-2 shrink-0">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-ink-900)] opacity-65" />
								<span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-ink-900)]" />
							</span>

							<Sparkles size={14} className="shrink-0 transition-transform duration-300 group-hover:rotate-12" />
							<span>Store Tour &amp; Live Inventory</span>
						</button>
					</MagneticHover>
				) : null}

				{/* Button 2: See How We Inspect & Ship */}
				{showButton2 ? (
					<MagneticHover fieldSelector="[data-magnetic-field]" strength={0.18} maxOffset={20}>
						<button
							type="button"
							onClick={() => openModal("See How We Inspect & Ship", howWeDeliverUrl)}
							className="group relative inline-flex items-center gap-2.5 rounded-full bg-[var(--color-accent-500)] px-4.5 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-900)] shadow-[0_6px_22px_-6px_color-mix(in_srgb,var(--color-accent-500)_60%,transparent)] transition-all duration-300 hover:scale-105 hover:bg-[var(--color-accent-600)] active:scale-95 animate-hero-btn-pulse-delay"
						>
							{/* Live Pinging Status Dot */}
							<span className="relative flex h-2 w-2 shrink-0">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-ink-900)] opacity-65" />
								<span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-ink-900)]" />
							</span>

							<Truck size={14} className="shrink-0 transition-transform duration-300 group-hover:-translate-x-0.5" />
							<span>See How We Inspect &amp; Ship</span>
							<Play size={11} className="shrink-0 fill-current opacity-80 transition-transform duration-300 group-hover:scale-110" />
						</button>
					</MagneticHover>
				) : null}
			</div>

			<HeroVideoModal
				isOpen={activeModal.isOpen}
				onClose={closeModal}
				title={activeModal.title}
				videoUrl={activeModal.videoUrl}
			/>
		</>
	);
}
