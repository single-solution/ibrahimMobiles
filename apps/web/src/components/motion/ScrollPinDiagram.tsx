"use client";

import { useGSAP } from "@gsap/react";
import { useRef, type ComponentType, type ReactNode } from "react";

import {
  ensureGsapPlugins,
  gsap,
  killScrollTriggers,
  prefersReducedMotion,
  ScrollTrigger,
} from "@/lib/motion/gsap";

/**
 * Scroll-pinned editorial diagram.
 *
 * Pins the section while the user scrolls a "stage" and progressively:
 *   1. Draws the connecting SVG path between stages.
 *   2. Pops each stage's icon node in with scale + opacity.
 *   3. Activates the matching detail panel on the right, cross-fading
 *      copy as scroll progress crosses each stage threshold.
 *
 * Render only on viewports wide enough to make pinning feel right —
 * the caller is expected to gate this component behind a `hidden lg:block`
 * wrapper and provide the original (non-pinned) markup as a fallback for
 * smaller screens.
 *
 * Path geometry is generic: three nodes laid out at x=12 / 50 / 88 (%) and
 * the path includes a gentle arc dip so the line reads as a journey, not
 * a ruler.
 */
export interface DiagramStage {
  key: string;
  /** Short label rendered above the title (eyebrow / kicker). */
  label: string;
  /** Main heading for this stage (rendered inside the active panel). */
  title: string;
  /** Body copy explaining the stage. */
  description: string;
  /** Lucide-style icon component used in the SVG node. */
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  /** Optional list of bullet steps shown when this stage is active. */
  steps?: Array<{ title: string; detail: string }>;
}

interface ScrollPinDiagramProps {
  stages: DiagramStage[];
  /** Heading rendered ABOVE the pinned stage (intro). */
  intro?: ReactNode;
  /** Optional caption rendered below the diagram (call to action). */
  footer?: ReactNode;
  className?: string;
}

export function ScrollPinDiagram({
  stages,
  intro,
  footer,
  className = "",
}: ScrollPinDiagramProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const stage = stageRef.current;
      const path = pathRef.current;
      if (!root || !stage) return;
      ensureGsapPlugins();
      if (prefersReducedMotion()) {
        // Make sure every panel is visible without animation.
        gsap.set("[data-diagram-panel]", { opacity: 1, y: 0 });
        gsap.set("[data-diagram-node]", { scale: 1, opacity: 1 });
        if (path) {
          gsap.set(path, { strokeDashoffset: 0 });
        }
        return;
      }

      const ctx = gsap.context(() => {
        if (path) {
          const length = path.getTotalLength();
          gsap.set(path, {
            strokeDasharray: length,
            strokeDashoffset: length,
          });
        }
        gsap.set("[data-diagram-node]", { scale: 0.5, opacity: 0 });
        gsap.set("[data-diagram-panel]", { opacity: 0, y: 18 });
        // First panel is visible by default — gets faded back in later
        // panels as scroll progresses.
        gsap.set('[data-diagram-panel="0"]', { opacity: 1, y: 0 });

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: stage,
            start: "top top",
            end: () => `+=${Math.max(1200, stages.length * 600)}`,
            pin: true,
            scrub: 0.7,
            anticipatePin: 1,
          },
        });

        // Phase 1 — draw the line and pop the first node.
        if (path) {
          timeline.to(
            path,
            {
              strokeDashoffset: 0,
              duration: stages.length,
              ease: "none",
            },
            0,
          );
        }
        stages.forEach((_, index) => {
          timeline.to(
            `[data-diagram-node="${index}"]`,
            { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" },
            index,
          );
          if (index === 0) return;
          timeline
            .to(
              `[data-diagram-panel="${index - 1}"]`,
              { opacity: 0, y: -18, duration: 0.35, ease: "power2.out" },
              index - 0.2,
            )
            .fromTo(
              `[data-diagram-panel="${index}"]`,
              { opacity: 0, y: 18 },
              { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
              index,
            );
        });
      }, root);

      return () => {
        ctx.revert();
        killScrollTriggers(root);
      };
    },
    { scope: rootRef, dependencies: [stages.length] },
  );

  // Pre-compute X positions for each node so the SVG path threads them.
  const nodeXs = stages.map(
    (_, index) => 12 + (76 * index) / Math.max(1, stages.length - 1),
  );
  const path = nodeXs.reduce<string>((acc, x, index) => {
    if (index === 0) return `M ${x} 50`;
    const prev = nodeXs[index - 1] ?? x;
    const cpX = (prev + x) / 2;
    // Alternate which way the curve dips so the journey feels organic.
    const cpY = index % 2 === 1 ? 18 : 82;
    return `${acc} Q ${cpX} ${cpY} ${x} 50`;
  }, "");

  return (
    <div
      ref={rootRef}
      className={`scroll-pin-diagram relative ${className}`.trim()}
    >
      {intro ? <div className="mb-12">{intro}</div> : null}
      <div ref={stageRef} className="relative">
        <div className="grid grid-cols-[1.05fr_1fr] gap-12 py-10">
          <div className="relative">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="aspect-[4/3] w-full text-[var(--color-accent-500)]"
              aria-hidden
            >
              <path
                ref={pathRef}
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
              {stages.map((_, index) => {
                const x = nodeXs[index] ?? 0;
                return (
                  <g
                    key={`node-${index}`}
                    data-diagram-node={index}
                    transform={`translate(${x}, 50)`}
                  >
                    <circle
                      r="5"
                      className="fill-[var(--color-canvas)] stroke-[var(--color-accent-500)]"
                      strokeWidth="0.6"
                    />
                    <circle r="2.4" className="fill-[var(--color-accent-500)]" />
                  </g>
                );
              })}
            </svg>
            <ul className="mt-2 grid grid-cols-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-600)]">
              {stages.map((stage) => (
                <li key={stage.key}>{stage.label}</li>
              ))}
            </ul>
          </div>
          <div className="relative">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.key}
                  data-diagram-panel={index}
                  className={`absolute inset-0 flex flex-col gap-4 ${
                    index === 0 ? "" : "pointer-events-none"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-[var(--color-ink-900)] text-[var(--color-accent-400)]">
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
                      {stage.label}
                    </p>
                  </div>
                  <h3 className="font-headline text-[40px] font-semibold leading-[0.95] tracking-[-0.01em] text-[var(--color-ink-900)] uppercase">
                    {stage.title}
                  </h3>
                  <p className="text-[15px] leading-snug text-[var(--color-ink-600)]">
                    {stage.description}
                  </p>
                  {stage.steps && stage.steps.length > 0 ? (
                    <ol className="mt-2 space-y-3">
                      {stage.steps.map((step, stepIndex) => (
                        <li
                          key={step.title}
                          className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-3"
                        >
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[12px] font-semibold text-[var(--color-accent-800)]">
                            {stepIndex + 1}
                          </span>
                          <div className="min-w-0 flex-1 leading-snug">
                            <p className="text-[14px] font-semibold text-[var(--color-ink-900)]">
                              {step.title}
                            </p>
                            <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-600)]">
                              {step.detail}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {footer ? <div className="mt-12">{footer}</div> : null}
    </div>
  );
}

export { ScrollTrigger };
