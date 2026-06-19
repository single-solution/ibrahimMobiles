import Link from "next/link";

import { StructuredContentFull } from "@/components/shared/StructuredContent";
import type { CategoryMeta } from "@/lib/core";

export function HomeCategoryComingSoon({ meta }: { meta: CategoryMeta }) {
	return (
		<div className="mx-auto max-w-2xl px-6 pb-24 pt-16 text-center md:pt-24">
			<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-700)]">
				Coming soon
			</p>
			<h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink-900)] md:text-4xl">
				{meta.label}
			</h1>
			<StructuredContentFull
				content={meta.content}
				fallback={meta.description}
				iconColor="var(--color-accent-700)"
				iconSize={14}
				iconSizeClass="size-[14px]"
				className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[var(--color-ink-600)]"
				bulletItemClassName="justify-center text-[13.5px] text-[var(--color-ink-700)]"
			/>
			<Link
				href="/"
				className="mt-6 inline-flex items-center gap-1 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink-800)] hover:border-[var(--color-ink-300)]"
			>
				Browse other categories →
			</Link>
		</div>
	);
}
