"use client";

import { EvolveHero } from "./_concepts/EvolveHero";
import { PreviewStyles } from "./_concepts/previewKit";

export default function BannerPreviewPage() {
  return (
    <div className="pb-20">
      <PreviewStyles />

      <div className="mx-auto flex max-w-[1180px] items-baseline gap-3 px-5 pb-3 pt-8 md:px-12">
        <h3 className="font-headline text-lg font-semibold uppercase tracking-tight text-[var(--color-ink-900)]">
          Evolved Mask-Sweep
        </h3>
        <span className="text-xs text-[var(--color-ink-400)]">Type-led · live motion</span>
      </div>

      <EvolveHero />
    </div>
  );
}
