"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import { ensureGsapPlugins, gsap, prefersReducedMotion } from "@/lib/motion/gsap";

import { MotionLabShell } from "../MotionLabShell";

export function PresetGeometricMesh() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || prefersReducedMotion()) return;
      ensureGsapPlugins();

      const ctx = gsap.context(() => {
        gsap.to("[data-mesh-blob]", {
          scale: 1.12,
          x: 12,
          duration: 5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
        gsap.from("[data-mesh-line]", {
          scaleX: 0,
          opacity: 0,
          duration: 1.2,
          stagger: 0.08,
          ease: "power3.out",
          transformOrigin: "left center",
        });
        gsap.from("[data-mesh-title]", {
          opacity: 0,
          y: 16,
          duration: 0.9,
          delay: 0.3,
        });
      }, root);

      return () => ctx.revert();
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="relative">
      <svg
        className="pointer-events-none absolute inset-0 size-full opacity-40"
        aria-hidden
      >
        <defs>
          <linearGradient id="mesh-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent-200)" />
            <stop offset="100%" stopColor="var(--color-accent-50)" />
          </linearGradient>
        </defs>
        <ellipse
          data-mesh-blob
          cx="50%"
          cy="40%"
          rx="42%"
          ry="28%"
          fill="url(#mesh-grad)"
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-8 top-1/3 space-y-3" aria-hidden>
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            data-mesh-line
            className="h-px bg-[var(--color-ink-200)]"
            style={{ width: `${70 + row * 10}%`, marginInline: "auto" }}
          />
        ))}
      </div>
      <MotionLabShell eyebrow="Style E · Geometric mesh">
        <h2
          data-mesh-title
          className="font-display text-5xl leading-[0.9] tracking-tight text-[var(--color-ink-900)] uppercase md:text-6xl"
        >
          fair priced
          <span className="mt-1 block text-[var(--color-accent-700)]">phones</span>
        </h2>
      </MotionLabShell>
    </div>
  );
}
