"use client";

/**
 * Chat settings tab inside admin Settings.
 *
 * Surfaces every `chat.*` Setting key the storefront widget consumes:
 *   - chat.enabled                 — master kill switch.
 *   - chat.liveModeEnabled         — toggles polling vs WebSocket lane.
 *   - chat.websocketUrl            — broker URL (empty = polling only).
 *   - chat.pollIntervalMsFocused   — foreground polling interval.
 *   - chat.pollIntervalMsBlurred   — background polling interval.
 *   - chat.guestThreadTokenDays    — lifetime of the guest cookie.
 *   - chat.attachmentsEnabled      — Phase 8.5 image/file uploads.
 *
 * Reads/writes go through the shared /api/settings PUT route which
 * invalidates the storefront cache on save, so toggling chat off
 * removes the FAB immediately.
 */

import { useEffect, useState } from "react";

import { adminFetch } from "@/lib/adminApi";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/forms/FormSection";
import { TextField } from "@/components/forms/TextField";
import { useToast } from "@/components/Toast";

interface ChatSettingsState {
  enabled: boolean;
  liveModeEnabled: boolean;
  websocketUrl: string;
  pollIntervalMsFocused: number;
  pollIntervalMsBlurred: number;
  guestThreadTokenDays: number;
  attachmentsEnabled: boolean;
}

const DEFAULTS: ChatSettingsState = {
  enabled: true,
  liveModeEnabled: false,
  websocketUrl: "",
  pollIntervalMsFocused: 5_000,
  pollIntervalMsBlurred: 30_000,
  guestThreadTokenDays: 90,
  attachmentsEnabled: false,
};

interface AdminSettingRow {
  key: string;
  value: unknown;
}

interface SettingsListResponse {
  items: AdminSettingRow[];
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function ChatSettingsTab() {
  const toast = useToast();
  const [draft, setDraft] = useState<ChatSettingsState>(DEFAULTS);
  const [saved, setSaved] = useState<ChatSettingsState>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await adminFetch<SettingsListResponse>(
          "/api/settings?group=chat",
        );
        if (cancelled) return;
        const map = new Map(response.items.map((row) => [row.key, row.value]));
        const state: ChatSettingsState = {
          enabled: asBoolean(map.get("chat.enabled"), DEFAULTS.enabled),
          liveModeEnabled: asBoolean(
            map.get("chat.liveModeEnabled"),
            DEFAULTS.liveModeEnabled,
          ),
          websocketUrl: asString(
            map.get("chat.websocketUrl"),
            DEFAULTS.websocketUrl,
          ),
          pollIntervalMsFocused: asNumber(
            map.get("chat.pollIntervalMsFocused"),
            DEFAULTS.pollIntervalMsFocused,
          ),
          pollIntervalMsBlurred: asNumber(
            map.get("chat.pollIntervalMsBlurred"),
            DEFAULTS.pollIntervalMsBlurred,
          ),
          guestThreadTokenDays: asNumber(
            map.get("chat.guestThreadTokenDays"),
            DEFAULTS.guestThreadTokenDays,
          ),
          attachmentsEnabled: asBoolean(
            map.get("chat.attachmentsEnabled"),
            DEFAULTS.attachmentsEnabled,
          ),
        };
        setDraft(state);
        setSaved(state);
      } catch (error) {
        toast.danger(
          error instanceof Error ? error.message : "Failed to load chat settings",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

  function setField<K extends keyof ChatSettingsState>(
    field: K,
    value: ChatSettingsState[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const updates: Array<[string, unknown]> = [
        ["chat.enabled", draft.enabled],
        ["chat.liveModeEnabled", draft.liveModeEnabled],
        ["chat.websocketUrl", draft.websocketUrl.trim()],
        ["chat.pollIntervalMsFocused", draft.pollIntervalMsFocused],
        ["chat.pollIntervalMsBlurred", draft.pollIntervalMsBlurred],
        ["chat.guestThreadTokenDays", draft.guestThreadTokenDays],
        ["chat.attachmentsEnabled", draft.attachmentsEnabled],
      ];
      for (const [key, value] of updates) {
        await adminFetch("/api/settings", {
          method: "PUT",
          json: { key, value, group: "chat" },
        });
      }
      setSaved(draft);
      toast.success("Chat settings saved");
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "Failed to save chat settings",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-ink-500)]">
        Loading chat settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FormSection
        title="Chat plugin"
        description="Controls the storefront chat widget — the FAB on every page and the customer-side conversation thread. Disable to remove the widget entirely without redeploying."
      >
        <ToggleRow
          label="Chat enabled"
          description="Master switch. When off, the storefront ships zero chat-widget JS."
          checked={draft.enabled}
          onChange={(value) => setField("enabled", value)}
        />
        <ToggleRow
          label="Attachments enabled"
          description="Allow image / file uploads inside the chat composer. Requires Phase 2 upload pipeline."
          checked={draft.attachmentsEnabled}
          onChange={(value) => setField("attachmentsEnabled", value)}
        />
      </FormSection>

      <FormSection
        title="Live transport"
        description="Polling is the default; the WebSocket broker is dormant until Phase 9. Enabling live mode without a broker URL is a no-op."
      >
        <ToggleRow
          label="Live mode (WebSocket)"
          description="When on AND a broker URL is set, clients try WebSocket first and fall back to polling."
          checked={draft.liveModeEnabled}
          onChange={(value) => setField("liveModeEnabled", value)}
        />
        <TextField
          label="WebSocket URL"
          value={draft.websocketUrl}
          onChange={(event) => setField("websocketUrl", event.target.value)}
          placeholder="wss://chat.example.com"
          hint="Empty disables live mode regardless of the toggle above."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Polling interval (focused tab)"
            value={draft.pollIntervalMsFocused}
            onChange={(value) => setField("pollIntervalMsFocused", value)}
            suffix="ms"
            min={1_000}
            max={60_000}
          />
          <NumberField
            label="Polling interval (background tab)"
            value={draft.pollIntervalMsBlurred}
            onChange={(value) => setField("pollIntervalMsBlurred", value)}
            suffix="ms"
            min={5_000}
            max={300_000}
          />
        </div>
      </FormSection>

      <FormSection
        title="Guest threads"
        description="Anonymous customers get a signed cookie so they keep seeing their threads on the same browser."
      >
        <NumberField
          label="Guest cookie lifetime"
          value={draft.guestThreadTokenDays}
          onChange={(value) => setField("guestThreadTokenDays", value)}
          suffix="days"
          min={1}
          max={365}
        />
      </FormSection>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--color-ink-100)] pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDraft(saved)}
          disabled={!isDirty || isSaving}
        >
          Discard
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          isLoading={isSaving}
          disabled={!isDirty}
        >
          Save chat settings
        </Button>
      </div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 rounded border-[var(--color-ink-300)]"
      />
      <div>
        <p className="text-sm font-semibold text-[var(--color-ink-900)]">{label}</p>
        <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{description}</p>
      </div>
    </label>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
}

function NumberField({ label, value, onChange, suffix, min, max }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {label}
      </span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className="h-9 flex-1 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink-800)] focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-300)]"
        />
        {suffix && (
          <span className="text-xs text-[var(--color-ink-500)]">{suffix}</span>
        )}
      </div>
    </label>
  );
}
