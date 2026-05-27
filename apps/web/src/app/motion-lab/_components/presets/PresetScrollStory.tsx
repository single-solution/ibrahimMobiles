"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import { killScrollTriggers, loadGsap, prefersReducedMotion } from "@/lib/motion/gsap";

import { MotionLabPhoneFan, MotionLabShell } from "../MotionLabShell";

const PROMISES = ["fair priced", "pta approved", "ruthlessly graded"];

export function PresetScrollStory() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const stage = stageRef.current;
      const headline = headlineRef.current;
      if (!root || !stage || !headline || prefersReducedMotion()) return;

      let ctx: { revert: () => void } | undefined;
      let cancelled = false;

      void loadGsap().then(({ gsap }) => {
        if (cancelled) return;
        ctx = gsap.context(() => {
          const words = gsap.utils.toArray<HTMLElement>("[data-story-word]");
          if (words.length === 0) return;

          gsap.set(words.slice(1), { opacity: 0, y: 32, position: "absolute", inset: 0 });

          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: stage,
              start: "top top",
              end: "+=140%",
              pin: true,
              scrub: 0.65,
            },
          });

          words.forEach((word, index) => {
            if (index === 0) return;
            timeline.to(
              words[index - 1],
              { opacity: 0, y: -24, duration: 1 },
              index,
            );
            timeline.fromTo(
              word,
              { opacity: 0, y: 32 },
              { opacity: 1, y: 0, duration: 1 },
              index,
            );
          });
        }, root);
      });

      return () => {
        cancelled = true;
        ctx?.revert();
        void killScrollTriggers(root);
      };
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef}>
      <div ref={stageRef} className="min-h-[160vh]">
        <MotionLabShell eyebrow="Style A+C · Scroll story">
          <div ref={headlineRef} className="relative mx-auto min-h-[5rem] max-w-lg">
            {PROMISES.map((word) => (
              <h2
                key={word}
                data-story-word
                className="font-display text-4xl leading-none tracking-tight text-[var(--color-ink-900)] uppercase md:text-6xl"
              >
                {word}
              </h2>
            ))}
          </div>
          <p className="mt-4 text-sm text-[var(--color-ink-500)]">
            Scroll — headline morphs through three promises
          </p>
          <div className="mt-8 opacity-90">
            <MotionLabPhoneFan />
          </div>
        </MotionLabShell>
      </div>
    </div>
  );
}
