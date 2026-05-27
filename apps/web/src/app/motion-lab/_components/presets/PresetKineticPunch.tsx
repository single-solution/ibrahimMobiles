"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import { loadGsap, prefersReducedMotion } from "@/lib/motion/gsap";

import { MotionLabShell } from "../MotionLabShell";

const WORD = "MOBILES";

export function PresetKineticPunch() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || prefersReducedMotion()) return;

      let ctx: { revert: () => void } | undefined;
      let cancelled = false;

      void loadGsap().then(({ gsap }) => {
        if (cancelled) return;
        ctx = gsap.context(() => {
          gsap.from("[data-punch-char]", {
            y: 80,
            opacity: 0,
            rotateX: -90,
            duration: 0.55,
            ease: "back.out(2)",
            stagger: 0.04,
          });
          gsap.from("[data-punch-sub]", {
            scaleX: 0,
            opacity: 0,
            duration: 0.5,
            ease: "power4.out",
            delay: 0.35,
          });
        }, root);
      });

      return () => {
        cancelled = true;
        ctx?.revert();
      };
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef}>
      <MotionLabShell eyebrow="Style B · Kinetic punch">
        <p
          data-punch-sub
          className="mb-3 origin-left text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--color-accent-700)]"
        >
          shop now
        </p>
        <h2 className="font-display text-6xl leading-none tracking-tighter text-[var(--color-ink-900)] uppercase md:text-8xl">
          {WORD.split("").map((char, index) => (
            <span
              key={`${char}-${index}`}
              data-punch-char
              className="inline-block"
              style={{ perspective: "400px" }}
            >
              {char}
            </span>
          ))}
        </h2>
      </MotionLabShell>
    </div>
  );
}
