"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import { ensureGsapPlugins, gsap, killScrollTriggers, prefersReducedMotion } from "@/lib/motion/gsap";

import { MotionLabPhoneFan, MotionLabShell } from "../MotionLabShell";

export function PresetCalmCinematic() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || prefersReducedMotion()) return;
      ensureGsapPlugins();

      const ctx = gsap.context(() => {
        gsap.from("[data-calm-line]", {
          y: 48,
          opacity: 0,
          duration: 1.4,
          ease: "power3.out",
          stagger: 0.18,
        });
        gsap.from("[data-calm-phone]", {
          y: 24,
          opacity: 0,
          scale: 0.92,
          duration: 1.2,
          ease: "power2.out",
          stagger: 0.12,
          delay: 0.35,
        });
        gsap.to("[data-calm-phone]", {
          y: -8,
          duration: 3.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: { each: 0.4, from: "center" },
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
      <MotionLabShell eyebrow="Style A · Calm cinematic">
        <h2
          data-calm-line
          className="font-display text-5xl leading-[0.9] tracking-tight text-[var(--color-ink-800)] uppercase md:text-7xl"
        >
          pre owned
          <span className="mt-2 block text-[var(--color-ink-900)]">mobiles</span>
        </h2>
        <div data-calm-phone className="mt-8">
          <MotionLabPhoneFan />
        </div>
      </MotionLabShell>
    </div>
  );
}
