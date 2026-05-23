"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { classNames } from "@store/shared";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "2xl";
  bodyClassName?: string;
}

const WIDTH_CLASSES: Record<NonNullable<DrawerProps["width"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  "2xl": "max-w-5xl",
};

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
  bodyClassName,
}: DrawerProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="animate-sheet-fade absolute inset-0 bg-[var(--color-ink-900)]/40"
      />
      <div
        className={classNames(
          "relative flex w-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]",
          width === "2xl"
            ? "h-[min(92vh,52rem)] max-h-[calc(100vh-2rem)]"
            : "max-h-[calc(100vh-3rem)]",
          WIDTH_CLASSES[width],
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--color-ink-100)] px-5 py-3">
          <div className="min-w-0 pr-1">
            <h2 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-ink-900)]">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-ink-500)]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
          >
            <X size={15} />
          </button>
        </header>

        <div
          className={classNames(
            "flex-1 overflow-y-auto px-5 py-4",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer && (
          <footer className="border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-5 py-2.5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
