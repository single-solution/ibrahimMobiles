import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "@/lib/utils";

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
        "shadow-[var(--shadow-sm)] transition-all duration-200",
        isInteractive && "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
