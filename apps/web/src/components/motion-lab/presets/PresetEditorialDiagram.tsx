"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import {
  ensureGsapPlugins,
  gsap,
  killScrollTriggers,
  prefersReducedMotion,
  ScrollTrigger,
} from "@/lib/motion/gsap";

import { MotionLabShell } from "../MotionLabShell";

export function PresetEditorialDiagram() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const pin = pinRef.current;
      if (!root || !pin || prefersReducedMotion()) return;
      ensureGsapPlugins();

      const ctx = gsap.context(() => {
        const path = pin.querySelector<SVGPathElement>("[data-flow-path]");
        if (path) {
          const length = path.getTotalLength();
          gsap.set(path, {
            strokeDasharray: length,
            strokeDashoffset: length,
          });
          gsap.to(path, {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
              trigger: pin,
              start: "top center",
              end: "bottom center",
              scrub: 0.8,
            },
          });
        }
        gsap.from("[data-flow-node]", {
          scale: 0.6,
          opacity: 0,
          stagger: 0.15,
          scrollTrigger: {
            trigger: pin,
            start: "top 75%",
            end: "center center",
            scrub: 0.6,
          },
        });
      }, root);

      return () => {
        ctx.revert();
        killScrollTriggers(root);
      };
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef}>
      <div ref={pinRef} className="min-h-[140vh]">
        <MotionLabShell eyebrow="Style C · Editorial diagram">
          <h2 className="font-headline text-2xl font-semibold text-[var(--color-ink-900)] md:text-3xl">
            Scroll to draw the flow
          </h2>
          <p className="mt-2 text-sm text-[var(--color-ink-500)]">
            Source → inspect → ship (scrubbed to your scroll)
          </p>
          <svg
            viewBox="0 0 320 120"
            className="mx-auto mt-8 w-full max-w-sm text-[var(--color-ink-300)]"
            aria-hidden
          >
            <path
              data-flow-path
              d="M 24 60 H 120 Q 160 60 160 30 T 200 60 H 296"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle data-flow-node cx="24" cy="60" r="10" className="fill-[var(--color-accent-500)]" />
            <circle data-flow-node cx="160" cy="30" r="10" className="fill-[var(--color-accent-300)]" />
            <circle data-flow-node cx="296" cy="60" r="10" className="fill-[var(--color-accent-500)]" />
          </svg>
          <div className="mt-6 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-600)]">
            <span>Source</span>
            <span>Inspect</span>
            <span>Ship</span>
          </div>
        </MotionLabShell>
        <div className="h-[40vh]" aria-hidden />
      </div>
    </div>
  );
}
