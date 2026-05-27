import type { CSSProperties, ReactNode } from "react";
import { classNames, coloredPillStyle } from "@store/shared";

interface ColoredPillProps {
  backgroundColor: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}

/** Solid pill with WCAG-based contrasting text — mirrors storefront `ColoredPill`. */
export function ColoredPill({
  backgroundColor,
  children,
  className,
  style,
  "aria-label": ariaLabel,
}: ColoredPillProps) {
  return (
    <span
      className={classNames("inline-flex items-center", className)}
      style={{ ...coloredPillStyle(backgroundColor), ...style }}
      aria-label={ariaLabel}
    >
      {children}
    </span>
  );
}
