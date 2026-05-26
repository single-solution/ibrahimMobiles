"use client";

import {
  useCallback,
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
 *     hooks (`.tilt-card-surface`, `.tilt-card-glow`) the children
 *     render as-is — no jank for SSR or first paint.
 */
interface TiltCardProps {
  children: ReactNode;
  /** Maximum tilt amount in degrees on each axis. Defaults to 8°. */
  intensity?: number;
  /** Scale to apply on hover (Apple-style "lift"). Defaults to 1.03. */
  hoverScale?: number;
  className?: string;
  style?: CSSProperties;
  /** Renders an interior gradient that tracks the cursor. */
  showGlow?: boolean;
}

export function TiltCard({
  children,
  intensity = 8,
  hoverScale = 1.03,
  className = "",
  style,
  showGlow = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0, mx: 50, my: 50, active: 0 });

  const apply = useCallback(() => {
    frameRef.current = null;
    const node = ref.current;
    if (!node) return;
    const { x, y, mx, my, active } = targetRef.current;
    node.style.setProperty("--tilt-x", `${x.toFixed(2)}deg`);
    node.style.setProperty("--tilt-y", `${y.toFixed(2)}deg`);
    node.style.setProperty("--tilt-active", String(active));
    node.style.setProperty("--mouse-x", `${mx.toFixed(2)}%`);
    node.style.setProperty("--mouse-y", `${my.toFixed(2)}%`);
  }, []);

  const schedule = useCallback(() => {
    if (frameRef.current != null) return;
    frameRef.current = window.requestAnimationFrame(apply);
  }, [apply]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const clampedX = Math.min(1, Math.max(0, px));
      const clampedY = Math.min(1, Math.max(0, py));
      targetRef.current.y = (clampedX - 0.5) * intensity * 2;
      targetRef.current.x = -(clampedY - 0.5) * intensity * 2;
      targetRef.current.mx = clampedX * 100;
      targetRef.current.my = clampedY * 100;
      targetRef.current.active = 1;
      schedule();
    };

    const handleLeave = () => {
      targetRef.current.x = 0;
      targetRef.current.y = 0;
      targetRef.current.active = 0;
      schedule();
    };

    node.addEventListener("pointermove", handleMove);
    node.addEventListener("pointerleave", handleLeave);
    return () => {
      node.removeEventListener("pointermove", handleMove);
      node.removeEventListener("pointerleave", handleLeave);
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [intensity, schedule]);

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
        {showGlow ? (
          <span className="tilt-card-glow" aria-hidden />
        ) : null}
      </div>
    </div>
  );
}
