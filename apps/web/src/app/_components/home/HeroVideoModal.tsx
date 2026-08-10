"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Play, X } from "lucide-react";

interface HeroVideoModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	videoUrl: string;
}

export function HeroVideoModal({ isOpen, onClose, title, videoUrl }: HeroVideoModalProps) {
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	useEffect(() => {
		if (!isOpen) {
			return;
		}
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				onClose();
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen || !isHydrated) {
		return null;
	}

	const trimmedUrl = videoUrl.trim();
	const isDirectVideo = trimmedUrl.endsWith(".mp4") || trimmedUrl.endsWith(".webm") || trimmedUrl.endsWith(".mov") || trimmedUrl.includes("blob:");

	const modalContent = (
		<div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[var(--z-modal,1000)] flex items-center justify-center p-4">
			<button type="button" aria-label="Close video modal" onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-sheet-fade" />
			<div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--color-ink-200)] bg-[var(--color-surface)] shadow-2xl animate-dialog-in">
				{/* Header */}
				<div className="flex shrink-0 items-center justify-between border-b border-[var(--color-ink-100)] px-5 py-3.5">
					<div className="flex items-center gap-2">
						<span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
						<h2 className="text-base font-bold text-[var(--color-ink-900)]">{title}</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="tap rounded-full p-1.5 text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-ink-100)] hover:text-[var(--color-ink-900)]"
						aria-label="Close modal"
					>
						<X size={20} />
					</button>
				</div>

				{/* Video Container */}
				<div className="relative flex aspect-video w-full items-center justify-center bg-black">
					{trimmedUrl ? (
						isDirectVideo ? (
							<video
								src={trimmedUrl}
								controls
								autoPlay
								playsInline
								className="h-full w-full object-contain"
							/>
						) : (
							<iframe
								src={trimmedUrl}
								title={title}
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								allowFullScreen
								className="h-full w-full border-0"
							/>
						)
					) : (
						<div className="flex flex-col items-center justify-center p-8 text-center text-white/80">
							<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
								<Play className="h-8 w-8 translate-x-0.5 text-emerald-400" />
							</div>
							<h3 className="text-lg font-semibold text-white">Video Preview Coming Soon</h3>
							<p className="mt-1.5 max-w-md text-xs text-white/60">
								The video for &quot;{title}&quot; is currently being updated in the store admin. Check back shortly or visit our official TikTok store!
							</p>
							<a
								href="https://www.tiktok.com/@ibrahimmobilestore"
								target="_blank"
								rel="noopener noreferrer"
								className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20"
							>
								Watch on TikTok
								<ExternalLink size={14} />
							</a>
						</div>
					)}
				</div>
			</div>
		</div>
	);

	return createPortal(modalContent, document.body);
}
