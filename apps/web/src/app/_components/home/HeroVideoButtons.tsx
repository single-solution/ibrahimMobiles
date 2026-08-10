"use client";

import { useState } from "react";
import { Play, Sparkles, Truck } from "lucide-react";
import { HeroVideoModal } from "@/app/_components/home/HeroVideoModal";
import { MagneticHover } from "@/components/shared/motion/MagneticHover";

interface HeroVideoButtonsProps {
	whoWeAreUrl?: string;
	howWeDeliverUrl?: string;
}

export function HeroVideoButtons({ whoWeAreUrl = "", howWeDeliverUrl = "" }: HeroVideoButtonsProps) {
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

	return (
		<>
			<div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 md:gap-3.5">
				{/* Button 1: Who We Are & What We Do */}
				<MagneticHover fieldSelector="[data-magnetic-field]" strength={0.15} maxOffset={18}>
					<button
						type="button"
						onClick={() => openModal("Who We Are & What We Do", whoWeAreUrl)}
						className="group relative inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-500)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-900)] shadow-[0_6px_20px_-6px_color-mix(in_srgb,var(--color-accent-500)_60%,transparent)] transition-all duration-300 hover:bg-[var(--color-accent-600)] active:scale-95 md:px-5 md:py-2.5 md:text-xs animate-hero-btn-pulse"
					>
						{/* Outer button ping ring */}
						<span className="pointer-events-none absolute -inset-0.5 animate-ping rounded-full border border-[var(--color-accent-500)] opacity-40" />

						<Sparkles size={14} className="shrink-0 transition-transform duration-300 group-hover:rotate-12" />
						<span>Who We Are &amp; What We Do</span>
					</button>
				</MagneticHover>

				{/* Button 2: How We Get & Deliver */}
				<MagneticHover fieldSelector="[data-magnetic-field]" strength={0.15} maxOffset={18}>
					<button
						type="button"
						onClick={() => openModal("How We Get & Deliver", howWeDeliverUrl)}
						className="group relative inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-900)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-700)] active:scale-95 md:px-5 md:py-2.5 md:text-xs animate-hero-btn-pulse-delay"
					>
						{/* Outer button ping ring */}
						<span className="pointer-events-none absolute -inset-0.5 animate-ping rounded-full border border-[var(--color-ink-300)] opacity-35" />

						<Truck size={14} className="shrink-0 text-[var(--color-accent-700)] transition-transform duration-300 group-hover:-translate-x-0.5" />
						<span>How We Get &amp; Deliver</span>
						<Play size={11} className="shrink-0 fill-current opacity-80 transition-transform duration-300 group-hover:scale-110" />
					</button>
				</MagneticHover>
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
