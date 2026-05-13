"use client";

import { Button } from "@/components/ui/Button";

interface SaveBarProps {
  onSave: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
  discardLabel?: string;
  hint?: string;
}

export function SaveBar({
  onSave,
  onDiscard,
  saveLabel = "Save changes",
  discardLabel = "Discard",
  hint,
}: SaveBarProps) {
  return (
    <div className="sticky bottom-0 z-20 -mx-6 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-ink-100)] bg-[var(--color-surface)]/95 px-6 py-3 backdrop-blur">
      <p className="text-xs text-[var(--color-ink-500)]">{hint ?? "Unsaved changes will be lost on refresh."}</p>
      <div className="flex items-center gap-2">
        {onDiscard && (
          <Button variant="ghost" size="sm" onClick={onDiscard} type="button">
            {discardLabel}
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={onSave} type="button">
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
