"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import { ensureGsapPlugins, gsap, prefersReducedMotion } from "@/lib/motion/gsap";

import { MotionLabPhoneFan, MotionLabShell } from "../MotionLabShell";

export function PresetHybridPremium() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || prefersReducedMotion()) return;
      ensureGsapPlugins();

      const ctx = gsap.context(() => {
        gsap.from("[data-hybrid-char]", {
          y: "0.4em",
          opacity: 0,
          filter: "blur(8px)",
          duration: 0.75,
          ease: "power3.out",
          stagger: 0.035,
        });
        gsap.to("[data-hybrid-orb]", {
          x: "random(-24, 24)",
          y: "random(-18, 18)",
          duration: "random(4, 7)",
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: { each: 0.5, from: "random" },
        });
        gsap.from("[data-hybrid-fan]", {
          opacity: 0,
          y: 20,
          duration: 1,
          delay: 0.5,
          ease: "power2.out",
        });
      }, root);

      return () => ctx.revert();
    },
    { scope: rootRef },
  );

  const line1 = "pre owned";
  const line2 = "mobiles";

  return (
    <div ref={rootRef} className="relative">
      <span
        data-hybrid-orb
        className="pointer-events-none absolute -left-8 top-8 size-32 rounded-full bg-[var(--color-accent-200)] opacity-50 blur-3xl"
        aria-hidden
      />
      <span
        data-hybrid-orb
        className="pointer-events-none absolute -right-6 bottom-12 size-40 rounded-full bg-[var(--color-accent-100)] opacity-60 blur-3xl"
        aria-hidden
      />
      <MotionLabShell eyebrow="Recommended · Hybrid premium">
        <h2 className="font-display text-5xl leading-[0.88] tracking-tight uppercase md:text-7xl">
          <span className="hero-display-outline block text-[var(--color-ink-700)]">
            {line1.split("").map((char, index) => (
              <span key={`l1-${index}`} data-hybrid-char className="inline-block">
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </span>
          <span className="hero-accent-mark mt-2 block text-[var(--color-ink-800)]">
            {line2.split("").map((char, index) => (
              <span key={`l2-${index}`} data-hybrid-char className="inline-block">
                {char}
              </span>
            ))}
          </span>
        </h2>
        <div data-hybrid-fan className="mt-8">
          <MotionLabPhoneFan />
        </div>
      </MotionLabShell>
    </div>
  );
}
