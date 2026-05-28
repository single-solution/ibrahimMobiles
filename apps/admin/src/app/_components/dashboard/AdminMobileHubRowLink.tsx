"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { InquiriesUnreadBadge } from "@/app/inquiries/_components/InquiriesUnreadBadge";
import { usePrefetchOnIntent } from "@/lib/navigation/usePrefetchOnIntent";
import { classNames } from "@store/shared";

interface AdminMobileHubRowLinkProps {
	href: string;
	label: string;
	icon: LucideIcon;
	trailing?: string | null;
	showInquiriesBadge?: boolean;
	isLast: boolean;
}

/**
 * Client wrapper for one row in the mobile admin hub. Lives in its own
 * file (rather than inline in `AdminMobileHubSections`) so the parent
 * stays an async server component — only the navigation primitive needs
 * to be on the client to get intent prefetch.
 */
export function AdminMobileHubRowLink({
	href,
	label,
	icon: Icon,
	trailing,
	showInquiriesBadge,
	isLast,
}: AdminMobileHubRowLinkProps): ReactNode {
	const prefetchHandlers = usePrefetchOnIntent(href);
	return (
		<Link
			href={href}
			onPointerDown={prefetchHandlers.onPointerDown}
			onTouchStart={prefetchHandlers.onTouchStart}
			onFocus={prefetchHandlers.onFocus}
			className={classNames(
				"tap flex h-12 items-center gap-3 px-3 font-medium text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)] active:bg-[var(--color-canvas-deep)]",
				!isLast && "border-b border-[var(--color-ink-100)]",
			)}
		>
			<span className="relative grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] text-[var(--color-ink-700)]">
				<Icon size={16} strokeWidth={2} />
				{showInquiriesBadge ? <InquiriesUnreadBadge /> : null}
			</span>
			<span className="flex-1 text-[0.875rem]">{label}</span>
			{trailing ? (
				<span className="text-[0.6875rem] text-[var(--color-ink-500)]">{trailing}</span>
			) : null}
			<ChevronRight size={16} className="text-[var(--color-ink-300)]" />
		</Link>
	);
}
