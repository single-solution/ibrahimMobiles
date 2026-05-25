"use client";

import { useEffect, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="animate-sheet-fade absolute inset-0 bg-[var(--color-ink-900)]/40"
      />
      <div className="relative w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-lg)] md:p-5">
        <div className="flex items-start gap-2.5 md:gap-3">
          {tone === "danger" && (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600 md:size-9">
              <AlertTriangle size={15} className="md:hidden" />
              <AlertTriangle size={17} className="hidden md:block" />
            </span>
          )}
          <div className="flex-1">
            <h2 className="text-[14px] font-semibold leading-snug text-[var(--color-ink-900)] md:text-[15px]">
              {title}
            </h2>
            <div className="mt-1 text-[13px] text-[var(--color-ink-600)] md:text-sm">
              {message}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 md:mt-5">
          <Button variant="outline" size="md" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            size="md"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
