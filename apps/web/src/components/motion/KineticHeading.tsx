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
  /** Default class on every line wrapper. */
  lineClassName?: string;
  /** Per-line class names (serializable strings for RSC → client). Index
   *  aligns with `lines` — omit or leave blank to fall back to
   *  `lineClassName`. */
  lineClassNames?: readonly string[];
  style?: CSSProperties;
}

function splitCharacters(
  line: string,
  lineIndex: number,
  characterStartIndex: number,
): ReactNode[] {
  /* Split the line into word + whitespace tokens so the browser is
     only allowed to break BETWEEN words, never mid-word. Each word
     becomes an `inline-block` wrapper holding its per-character spans
     (the chars stay `inline-block` so GSAP can transform them
     individually). The whitespace between words is rendered as a
     normal text node — that's the only break opportunity the
     line-breaking algorithm sees, so single words like "Three" or
     "Welcome" can never be split across two lines.

     `globalIndex` increments per source character (including spaces
     we don't actually emit a span for) so the kinetic-stagger CSS
     index stays continuous across multi-line headings and matches
     the math in `lineStartIndexes`. */
  const tokens = line.split(/(\s+)/);
  const result: ReactNode[] = [];
  let cursor = 0;
  let wordCounter = 0;

  for (const token of tokens) {
    if (token.length === 0) {
      continue;
    }
    if (/^\s+$/.test(token)) {
      /* Wrap whitespace in a keyed span so the surrounding array
         doesn't trigger React's "missing key" warning, but leave
         the whitespace as plain text so the browser's line-break
         algorithm still treats it as a normal break opportunity
         between the word wrappers. */
      result.push(
        <span key={`l${lineIndex}-ws-${cursor}`}>{token}</span>,
      );
      cursor += token.length;
      continue;
    }

    const chars: ReactNode[] = [];
    for (let i = 0; i < token.length; i++) {
      const char = token[i];
      const globalIndex = characterStartIndex + cursor + i;
      chars.push(
        <span
          key={`l${lineIndex}-c${cursor + i}`}
          className="kinetic-char inline-block will-change-transform"
          data-kinetic-char
          style={{ ["--kinetic-i" as string]: String(globalIndex) } as CSSProperties}
          aria-hidden
        >
          {char}
        </span>,
      );
    }
    result.push(
      <span
        key={`l${lineIndex}-w${wordCounter}`}
        className="kinetic-word inline-block whitespace-nowrap"
      >
        {chars}
      </span>,
    );
    cursor += token.length;
    wordCounter += 1;
  }

  return result;
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
  lineClassNames,
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
        const perLineClass = lineClassNames?.[lineIndex] ?? lineClassName;
        return (
          <span
            key={`line-${lineIndex}`}
            className={`kinetic-line block ${perLineClass}`.trim()}
          >
            {characters}
          </span>
        );
      })}
    </Tag>
  );
}
