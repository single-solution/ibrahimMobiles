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
						className="group relative inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-[0_8px_25px_rgba(16,185,129,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_35px_rgba(16,185,129,0.5)] active:scale-95 md:px-6 md:py-3.5 md:text-sm"
					>
						{/* Pinging pulse dot */}
						<span className="relative flex h-2.5 w-2.5">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-950 opacity-75" />
							<span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-950" />
						</span>
						<Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
						<span>Who We Are &amp; What We Do</span>
						<span className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/15 transition-transform duration-300 group-hover:scale-110">
							<Play className="h-3 w-3 translate-x-0.5 fill-slate-950 text-slate-950" />
						</span>
					</button>
				</MagneticHover>

				{/* Button 2: How We Get & Deliver */}
				<MagneticHover fieldSelector="[data-magnetic-field]" strength={0.2} maxOffset={25}>
					<button
						type="button"
						onClick={() => openModal("How We Get & Deliver", howWeDeliverUrl)}
						className="group relative inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-[0_8px_25px_rgba(245,158,11,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_35px_rgba(245,158,11,0.5)] active:scale-95 md:px-6 md:py-3.5 md:text-sm"
					>
						{/* Pinging pulse dot */}
						<span className="relative flex h-2.5 w-2.5">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-950 opacity-75" />
							<span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-950" />
						</span>
						<Truck className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
						<span>How We Get &amp; Deliver</span>
						<span className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/15 transition-transform duration-300 group-hover:scale-110">
							<Play className="h-3 w-3 translate-x-0.5 fill-slate-950 text-slate-950" />
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
