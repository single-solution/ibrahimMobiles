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
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)]/85 px-4 py-2.5 backdrop-blur md:-mx-6 md:mt-8 md:gap-3 md:px-6 md:py-3">
      <p className="text-[11px] text-[var(--color-ink-500)] md:text-xs">
        {hint ?? "Unsaved changes will be lost on refresh."}
      </p>
      <div className="flex items-center gap-2">
        {onDiscard && (
          <Button variant="ghost" size="md" onClick={onDiscard} type="button">
            {discardLabel}
          </Button>
        )}
        <Button variant="primary" size="md" onClick={onSave} type="button">
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
