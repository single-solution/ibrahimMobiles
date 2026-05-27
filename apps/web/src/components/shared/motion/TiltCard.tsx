"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * 3D tilt wrapper — gives any child a subtle Apple-style perspective
 * shift driven by the pointer's position inside the element.
 *
 * Implementation notes
 * --------------------
 *
 *   • **All work happens in CSS via custom properties.** We set
 *     `--tilt-x`, `--tilt-y`, `--mouse-x`, `--mouse-y` on the root and
 *     let CSS handle the transform + glow. JavaScript only ever writes
 *     to inline styles — no React re-renders, no layout thrash.
 *
 *   • **rAF coalesces mousemove.** Pointer events fire faster than the
 *     compositor can paint; queuing the write to the next animation
 *     frame keeps the work tied to display refresh.
 *
 *   • **`prefers-reduced-motion` + coarse pointer kill the effect**
 *     so phones and accessibility-respecting users see a flat card.
 *
 *   • **The component is purely additive.** Without the inner CSS
 *     hook (`.tilt-card-surface`) the children render as-is — no jank
 *     for SSR or first paint.
 */
interface TiltCardProps {
  children: ReactNode;
  /** Maximum tilt amount in degrees on each axis. Defaults to 8°. */
  intensity?: number;
  /** Scale to apply on hover (Apple-style "lift"). Defaults to 1.03. */
  hoverScale?: number;
  className?: string;
  style?: CSSProperties;
}

export function TiltCard({
  children,
  intensity = 8,
  hoverScale = 1.03,
  className = "",
  style,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    // Cache the element rect — `getBoundingClientRect()` triggers layout
    // when called inside a high-frequency event handler. We refresh only
    // on entry, resize and scroll (the values that can actually change
    // the element's screen position).
    let rect = node.getBoundingClientRect();
    const refreshRect = () => {
      rect = node.getBoundingClientRect();
    };

    let frame: number | null = null;
    const target = { x: 0, y: 0, mx: 50, my: 50, active: 0 };

    const apply = () => {
      frame = null;
      node.style.setProperty("--tilt-x", `${target.x.toFixed(2)}deg`);
      node.style.setProperty("--tilt-y", `${target.y.toFixed(2)}deg`);
      node.style.setProperty("--tilt-active", String(target.active));
      node.style.setProperty("--mouse-x", `${target.mx.toFixed(2)}%`);
      node.style.setProperty("--mouse-y", `${target.my.toFixed(2)}%`);
    };

    const schedule = () => {
      if (frame != null) return;
      frame = window.requestAnimationFrame(apply);
    };

    const handleEnter = () => {
      refreshRect();
      node.dataset.tiltActive = "1";
    };

    const handleMove = (event: PointerEvent) => {
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const clampedX = Math.min(1, Math.max(0, px));
      const clampedY = Math.min(1, Math.max(0, py));
      target.y = (clampedX - 0.5) * intensity * 2;
      target.x = -(clampedY - 0.5) * intensity * 2;
      target.mx = clampedX * 100;
      target.my = clampedY * 100;
      target.active = 1;
      schedule();
    };

    const handleLeave = () => {
      target.x = 0;
      target.y = 0;
      target.active = 0;
      delete node.dataset.tiltActive;
      schedule();
    };

    node.addEventListener("pointerenter", handleEnter, { passive: true });
    node.addEventListener("pointermove", handleMove, { passive: true });
    node.addEventListener("pointerleave", handleLeave, { passive: true });
    window.addEventListener("resize", refreshRect, { passive: true });
    window.addEventListener("scroll", refreshRect, { passive: true });
    return () => {
      node.removeEventListener("pointerenter", handleEnter);
      node.removeEventListener("pointermove", handleMove);
      node.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("resize", refreshRect);
      window.removeEventListener("scroll", refreshRect);
      if (frame != null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [intensity]);

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`.trim()}
      style={
        {
          ...style,
          "--tilt-hover-scale": hoverScale,
        } as CSSProperties
      }
    >
      <div className="tilt-card-surface">
        {children}
        <span className="tilt-card-edge" aria-hidden />
      </div>
    </div>
  );
}
