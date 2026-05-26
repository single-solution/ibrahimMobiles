"use client";

import { useEffect, useRef } from "react";

/**
 * Hero ambience layer — sits behind hero content (pointer-events: none,
 * z-index: 0) and gives the section depth via:
 *
 *   1. **Drifting orbs** — three large blurred chartreuse/cream
 *      gradients animated with slow CSS keyframes (no JS) so the
 *      background subtly breathes.
 *
 *   2. **Cursor spotlight** — a low-opacity radial gradient that
 *      tracks the pointer inside the hero. We listen on the *parent*
 *      via JS, write the cursor position into CSS variables on this
 *      element, and let the gradient render via `radial-gradient
 *      at var(--spot-x) var(--spot-y)`.
 *
 * Both effects are CSS-only after first frame — no React re-renders,
 * no layout thrash. Reduced-motion users get the static orbs only.
 */
export function HeroAmbience() {
  const ref = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 50, y: 40, active: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const section = node.parentElement;
    if (!section) return;

    // Cache the section rect; refresh on resize / scroll only.
    let rect = section.getBoundingClientRect();
    const refreshRect = () => {
      rect = section.getBoundingClientRect();
    };

    // Pause when the section is offscreen — there's no point computing
    // a cursor spotlight nobody can see, and pausing also lets the
    // browser stop compositing the blurred orb layer.
    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        visible = entry.isIntersecting;
        node.dataset.ambienceVisible = visible ? "1" : "0";
      },
      { rootMargin: "120px 0px" },
    );
    io.observe(section);
    node.dataset.ambienceVisible = "1";

    const apply = () => {
      frameRef.current = null;
      const { x, y, active } = targetRef.current;
      node.style.setProperty("--spot-x", `${x.toFixed(2)}%`);
      node.style.setProperty("--spot-y", `${y.toFixed(2)}%`);
      node.style.setProperty("--spot-active", String(active));
    };

    const schedule = () => {
      if (frameRef.current != null) return;
      frameRef.current = window.requestAnimationFrame(apply);
    };

    const handleMove = (event: PointerEvent) => {
      if (!visible) return;
      const px = ((event.clientX - rect.left) / rect.width) * 100;
      const py = ((event.clientY - rect.top) / rect.height) * 100;
      targetRef.current.x = px;
      targetRef.current.y = py;
      targetRef.current.active = 1;
      schedule();
    };

    const handleLeave = () => {
      targetRef.current.active = 0;
      schedule();
    };

    section.addEventListener("pointermove", handleMove, { passive: true });
    section.addEventListener("pointerleave", handleLeave, { passive: true });
    window.addEventListener("resize", refreshRect, { passive: true });
    window.addEventListener("scroll", refreshRect, { passive: true });
    return () => {
      section.removeEventListener("pointermove", handleMove);
      section.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("resize", refreshRect);
      window.removeEventListener("scroll", refreshRect);
      io.disconnect();
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={ref} className="hero-ambience" aria-hidden>
      <span className="hero-orb hero-orb--a" />
      <span className="hero-orb hero-orb--b" />
      <span className="hero-orb hero-orb--c" />
      <span className="hero-spotlight" />
    </div>
  );
}
