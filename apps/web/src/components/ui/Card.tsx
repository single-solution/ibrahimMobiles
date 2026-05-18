import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "@store/shared";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  isInteractive?: boolean;
  children: ReactNode;
}

export function Card({ isInteractive = false, className, children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={classNames(
        "rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]",
        "shadow-[var(--shadow-sm)]",
        isInteractive && "lift hover:border-[var(--color-ink-200)]",
        !isInteractive && "transition-colors duration-200",
        className,
      )}
    >
      {children}
    </div>
  );
}
