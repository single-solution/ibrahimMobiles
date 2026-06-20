"use client";

import { Tag } from "lucide-react";

export function ProductCardOfferBadge({ label }: { label: string }) {
	return (
		<span className="inline-flex max-w-[7.5rem] items-center gap-1 rounded-sm bg-[var(--color-accent-100)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-accent-800)] shadow-sm md:max-w-[9rem]">
			<Tag size={10} aria-hidden className="shrink-0" />
			<span className="truncate">{label}</span>
		</span>
	);
}
