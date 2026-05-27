"use client";

import { useState, type ReactNode } from "react";
import type { StoreSettings } from "@store/shared";
import { TextField } from "@/components/forms/TextField";
import {
  SettingsFormPanel,
  SettingsSaveFooter,
} from "@/app/settings/_components/settingsWorkspaceUi";
import { useToast } from "@/components/ui/Toast";

interface SaveableSectionProps {
  fields: ReadonlyArray<keyof StoreSettings>;
  draft: StoreSettings;
  saved: StoreSettings;
  setField<K extends keyof StoreSettings>(field: K, value: StoreSettings[K]): void;
  onSaved(settings: StoreSettings): void;
  canUpdate: boolean;
  children: ReactNode;
  /** Optional content rendered above the form (e.g. <SettingsTabHero />). */
  hero?: ReactNode;
}

export function SaveableSection({
  fields,
  draft,
  saved,
  setField,
  onSaved,
  canUpdate,
  children,
  hero,
}: SaveableSectionProps) {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const dirtyCount = fields.reduce(
    (count, field) => (draft[field] !== saved[field] ? count + 1 : count),
    0,
  );
  const isDirty = dirtyCount > 0;

  async function handleSave() {
    if (isSaving || !isDirty) {
      return;
    }
    setIsSaving(true);
    try {
      const payload = Object.fromEntries(
        fields.map((field) => [field, draft[field]]),
      ) as Partial<StoreSettings>;
      const response = await fetch("/api/settings/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Save failed (${response.status})`);
      }
      const body = (await response.json()) as { settings: StoreSettings };
      onSaved(body.settings);
      toast.success("Settings saved");
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsFormPanel
      footer={
        canUpdate ? (
          <SettingsSaveFooter
            onSave={handleSave}
            onDiscard={() => {
              for (const field of fields) {
                setField(field, saved[field]);
              }
            }}
            showDiscard={isDirty}
            saveLabel={isSaving ? "Saving…" : isDirty ? "Save changes" : "Saved"}
            dirtyCount={dirtyCount}
          />
        ) : undefined
      }
    >
      {hero ? <div className="pt-4 md:pt-5">{hero}</div> : null}
      {children}
    </SettingsFormPanel>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange(value: number): void;
  trailingAddon?: string;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  /** Override the width cap. Defaults to `max-w-xs` since numbers are short. */
  containerClassName?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  trailingAddon,
  disabled,
  placeholder,
  hint,
  containerClassName,
}: NumberFieldProps) {
  return (
    <TextField
      label={label}
      type="number"
      value={Number.isFinite(value) ? String(value) : ""}
      onChange={(event) => {
        const next = Number(event.target.value);
        onChange(Number.isFinite(next) ? next : 0);
      }}
      trailingAddon={trailingAddon}
      placeholder={placeholder}
      hint={hint}
      inputMode="decimal"
      disabled={disabled}
      // Numeric values like "5%" or "30 days" only need ~10 characters of input
      // width — letting them stretch to 1000px on a wide monitor looks odd. We
      // cap at `max-w-xs` (~20rem) by default; callers can override for fields
      // that benefit from more room (e.g. large rupee amounts).
      containerClassName={containerClassName ?? "max-w-xs"}
    />
  );
}
