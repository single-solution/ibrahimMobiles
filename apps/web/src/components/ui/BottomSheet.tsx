"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { classNames } from "@store/shared";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  height?: "auto" | "sm" | "md" | "lg" | "full";
  showHandle?: boolean;
  showCloseButton?: boolean;
  contentClassName?: string;
}

const HEIGHT_CLASSES: Record<NonNullable<BottomSheetProps["height"]>, string> = {
  auto: "max-h-[85vh]",
  sm: "h-[50vh]",
  md: "h-[70vh]",
  lg: "h-[88vh]",
  full: "h-[100dvh]",
};

export function BottomSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  height = "auto",
  showHandle = true,
  showCloseButton = true,
  contentClassName,
}: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const isFull = height === "full";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-sheet-fade bg-[var(--color-ink-900)]/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={classNames(
          "relative flex flex-col overflow-hidden bg-[var(--color-canvas)] shadow-[var(--shadow-lg)] animate-sheet-up",
          HEIGHT_CLASSES[height],
          isFull ? "rounded-none" : "rounded-t-[var(--radius-xl)]",
        )}
      >
        {showHandle && !isFull && (
          <div className="flex justify-center pt-2.5 pb-1.5">
            <span className="h-1 w-10 rounded-full bg-[var(--color-ink-200)]" />
          </div>
        )}

        {(title || showCloseButton) && (
          <div
            className={classNames(
              "flex items-start gap-3 px-5",
              isFull ? "safe-top h-14 items-center border-b border-[var(--color-ink-100)]" : "pt-2 pb-3",
            )}
          >
            {title && (
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold tracking-tight text-[var(--color-ink-900)]">
                  {title}
                </h2>
                {description && (
                  <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{description}</p>
                )}
              </div>
            )}
            {showCloseButton && (
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="-mr-2 grid size-9 shrink-0 place-items-center rounded-full text-[var(--color-ink-600)] active:bg-[var(--color-surface-muted)]"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        <div
          className={classNames(
            "sheet-stagger flex-1 overflow-y-auto overscroll-contain px-5 pb-6",
            contentClassName,
          )}
        >
          {children}
        </div>

        {footer && (
          <div
            className="border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-5 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
