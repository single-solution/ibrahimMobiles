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
			<div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:gap-4">
				{/* Button 1: Who We Are & What We Do */}
				<MagneticHover fieldSelector="[data-magnetic-field]" strength={0.2} maxOffset={25}>
					<button
						type="button"
						onClick={() => openModal("Who We Are & What We Do", whoWeAreUrl)}
						className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-cyan-500/35 bg-[var(--color-surface)]/85 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-900)] backdrop-blur-md shadow-[0_4px_22px_rgba(6,182,212,0.18)] transition-all duration-300 hover:border-cyan-400 hover:bg-[var(--color-surface)] hover:shadow-[0_8px_32px_rgba(6,182,212,0.4)] active:scale-95 md:px-6 md:py-3.5 md:text-sm animate-hero-btn-pulse"
					>
						{/* Shimmer sweep effect */}
						<span className="pointer-events-none absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent transition-all duration-1000 group-hover:left-full" />

						{/* Pinging glowing play badge */}
						<span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500 text-slate-950 shadow-[0_0_14px_rgba(6,182,212,0.65)] transition-transform duration-300 group-hover:scale-110">
							<span className="absolute inset-0 animate-ping rounded-full bg-cyan-400 opacity-75" />
							<Play className="relative z-10 h-3.5 w-3.5 translate-x-0.5 fill-slate-950 text-slate-950" />
						</span>

						<span className="flex items-center gap-2">
							<Sparkles className="h-4 w-4 text-cyan-400 transition-transform duration-300 group-hover:rotate-12" />
							<span>Who We Are &amp; What We Do</span>
						</span>
					</button>
				</MagneticHover>

				{/* Button 2: How We Get & Deliver */}
				<MagneticHover fieldSelector="[data-magnetic-field]" strength={0.2} maxOffset={25}>
					<button
						type="button"
						onClick={() => openModal("How We Get & Deliver", howWeDeliverUrl)}
						className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-amber-500/35 bg-[var(--color-surface)]/85 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-900)] backdrop-blur-md shadow-[0_4px_22px_rgba(245,158,11,0.18)] transition-all duration-300 hover:border-amber-400 hover:bg-[var(--color-surface)] hover:shadow-[0_8px_32px_rgba(245,158,11,0.4)] active:scale-95 md:px-6 md:py-3.5 md:text-sm animate-hero-btn-pulse-delay"
					>
						{/* Shimmer sweep effect */}
						<span className="pointer-events-none absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent transition-all duration-1000 group-hover:left-full" />

						{/* Pinging glowing play badge */}
						<span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.65)] transition-transform duration-300 group-hover:scale-110">
							<span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-75" />
							<Truck className="relative z-10 h-3.5 w-3.5 text-slate-950" />
						</span>

						<span className="flex items-center gap-2">
							<span>How We Get &amp; Deliver</span>
						</span>
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
