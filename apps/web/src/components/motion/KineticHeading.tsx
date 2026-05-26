"use client";

import { useGSAP } from "@gsap/react";
import { useRef, type CSSProperties, type ElementType, type ReactNode } from "react";

import { ensureGsapPlugins, gsap, prefersReducedMotion, ScrollTrigger } from "@/lib/motion/gsap";

/**
 * Kinetic-punch headline.
 *
 * Splits the provided text into per-character spans and fires a GSAP
 * timeline when the heading enters the viewport. Each character drops
 * in from below with rotateX + blur and settles on a back-out spring
 * for the signature "punch" feel.
 *
 *   • Lines are kept as separate blocks so descenders/x-heights line up
 *     with the surrounding type — we never collapse them into one row.
 *   • Whitespace is rendered as fixed-width non-breaking gaps so the
 *     character indices stay continuous (animation timing reads cleanly
 *     across the whole headline).
 *   • Respect for `prefers-reduced-motion` — we skip the timeline and
 *     render the final visible state immediately.
 *   • The wrapper element type can be overridden via `as` (h1/h2/p).
 *
 * Usage:
 *   <KineticHeading as="h2" lines={["how it", "works"]} />
 */
export interface KineticHeadingProps {
  /** Text to animate. Pass an array for multi-line headings. */
  lines: string | readonly string[];
  /** Tag to render. Defaults to span (no semantic weight). */
  as?: ElementType;
  /** Stagger between characters in seconds. Defaults to 0.04. */
  stagger?: number;
  /** Delay before the timeline starts in seconds. */
  delay?: number;
  /** Scroll-trigger start position (passed through to GSAP). */
  start?: string;
  /** Skip the ScrollTrigger and fire immediately on mount. */
  immediate?: boolean;
  className?: string;
  /** Style applied to the line wrappers (each `<span class="kinetic-line">`). */
  lineClassName?: string;
  /** Optional render-prop wrapper for individual lines (e.g. add hero
   *  outline / accent-mark spans). The function receives the rendered
   *  character spans and the line index. */
  renderLine?: (children: ReactNode, lineIndex: number) => ReactNode;
  style?: CSSProperties;
}

function splitCharacters(line: string, lineIndex: number, characterStartIndex: number): ReactNode[] {
  return Array.from(line).map((char, charIndex) => {
    const globalIndex = characterStartIndex + charIndex;
    return (
      <span
        key={`${lineIndex}-${charIndex}-${char}`}
        className="kinetic-char inline-block will-change-transform"
        data-kinetic-char
        style={{ ["--kinetic-i" as string]: String(globalIndex) } as CSSProperties}
        aria-hidden
      >
        {char === " " ? "\u00A0" : char}
      </span>
    );
  });
}

export function KineticHeading({
  lines,
  as: Tag = "span",
  stagger = 0.04,
  delay = 0,
  start = "top 85%",
  immediate = false,
  className = "",
  lineClassName = "",
  renderLine,
  style,
}: KineticHeadingProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const normalisedLines: readonly string[] = Array.isArray(lines) ? lines : [lines as string];
  const accessibleLabel = normalisedLines.join(" ").trim();

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      ensureGsapPlugins();
      const chars = root.querySelectorAll<HTMLElement>("[data-kinetic-char]");
      if (chars.length === 0) return;

      if (prefersReducedMotion()) {
        gsap.set(chars, { opacity: 1, y: 0, rotateX: 0, filter: "none" });
        return;
      }

      gsap.set(chars, {
        opacity: 0,
        y: "0.55em",
        rotateX: -78,
        filter: "blur(8px)",
        transformOrigin: "50% 100%",
      });

      const tween = {
        opacity: 1,
        y: 0,
        rotateX: 0,
        filter: "blur(0px)",
        duration: 0.7,
        ease: "back.out(1.7)",
        stagger,
        delay,
      };

      if (immediate) {
        gsap.to(chars, tween);
        return;
      }

      const trigger = ScrollTrigger.create({
        trigger: root,
        start,
        once: true,
        onEnter: () => {
          gsap.to(chars, tween);
        },
      });

      return () => trigger.kill();
    },
    { scope: rootRef, dependencies: [normalisedLines.join("|"), immediate, stagger, delay, start] },
  );

  // Compute per-line character offsets up front (immutable map step)
  // so we never mutate a running cursor during the render mapping.
  const lineStartIndexes = normalisedLines.reduce<number[]>((acc, line, index) => {
    if (index === 0) {
      acc.push(0);
      return acc;
    }
    const prevLength = normalisedLines[index - 1]?.length ?? 0;
    acc.push((acc[index - 1] ?? 0) + prevLength);
    return acc;
  }, []);

  return (
    <Tag
      ref={rootRef as never}
      className={`kinetic-heading ${className}`.trim()}
      style={{ perspective: "640px", ...style }}
      aria-label={accessibleLabel || undefined}
    >
      {normalisedLines.map((line, lineIndex) => {
        const startIndex = lineStartIndexes[lineIndex] ?? 0;
        const characters = splitCharacters(line, lineIndex, startIndex);
        const block = (
          <span
            key={`line-${lineIndex}`}
            className={`kinetic-line block ${lineClassName}`.trim()}
          >
            {characters}
          </span>
        );
        return renderLine ? (
          <span key={`render-${lineIndex}`} className="block">
            {renderLine(characters, lineIndex)}
          </span>
        ) : (
          block
        );
      })}
    </Tag>
  );
}
