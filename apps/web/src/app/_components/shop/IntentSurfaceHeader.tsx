interface IntentSurfaceHeaderProps {
	headline: string;
	intro: string;
}

export function IntentSurfaceHeader({ headline, intro }: IntentSurfaceHeaderProps) {
	return (
		<header className="reveal reveal-rise border-b border-[var(--color-ink-100)] px-0 pb-6 pt-2 md:pb-8">
			<h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink-900)] md:text-3xl">{headline}</h1>
			{intro ? <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--color-ink-600)] md:text-[15px]">{intro}</p> : null}
		</header>
	);
}
