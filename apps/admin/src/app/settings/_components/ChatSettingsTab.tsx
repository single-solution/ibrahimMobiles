"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { FormSection } from "@/components/forms/FormSection";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { Toggle } from "@/components/ui/Toggle";
import {
  SettingsFormPanel,
  SettingsLoadingPanel,
  SettingsSaveFooter,
} from "@/app/settings/_components/settingsWorkspaceUi";
import { useToast } from "@/components/ui/Toast";
import {
  CHAT_ASSISTANT_DEFAULT_MODELS,
  CHAT_ASSISTANT_DEFAULT_NAME,
  CHAT_ASSISTANT_PROVIDER_LABELS,
  CHAT_SETTING_DEFAULTS,
  CHAT_WELCOME_CUSTOMER_DEFAULT,
  CHAT_WELCOME_GUEST_DEFAULT,
  classNames,
  type ChatAssistantProvider,
  type ChatSettingsValues,
} from "@store/shared";

interface ProviderStatus {
  configured: boolean;
  model: string;
  defaultModel: string;
  dbModel: string;
}

interface ChatSettingsResponse {
  settings: ChatSettingsValues;
  providers: Record<ChatAssistantProvider, ProviderStatus>;
}

export function ChatSettingsTab({ readOnly = false }: { readOnly?: boolean }) {
  const toast = useToast();
  const [draft, setDraft] = useState<ChatSettingsValues>(CHAT_SETTING_DEFAULTS);
  const [saved, setSaved] = useState<ChatSettingsValues>(CHAT_SETTING_DEFAULTS);
  const [providers, setProviders] = useState<ChatSettingsResponse["providers"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiFetch<ChatSettingsResponse>("/api/settings/chat");
        if (cancelled) return;
        setDraft(data.settings);
        setSaved(data.settings);
        setProviders(data.providers);
      } catch (error) {
        toast.danger(error instanceof Error ? error.message : "Failed to load chat settings");
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

  function setField<K extends keyof ChatSettingsValues>(field: K, value: ChatSettingsValues[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    if (isSaving || !isDirty) return;
    setIsSaving(true);
    try {
      const data = await apiFetch<ChatSettingsResponse>("/api/settings/chat", {
        method: "PUT",
        json: draft,
      });
      setDraft(data.settings);
      setSaved(data.settings);
      setProviders(data.providers);
      toast.success("Chat settings saved");
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to save chat settings");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <SettingsLoadingPanel />;
  }

  return (
    <SettingsFormPanel
      footer={
        !readOnly ? (
          <SettingsSaveFooter
            onSave={handleSave}
            onDiscard={() => setDraft(saved)}
            showDiscard={isDirty}
            saveLabel={isSaving ? "Saving…" : isDirty ? "Save chat settings" : "Saved"}
            hint={isDirty ? "You have unsaved chat widget changes." : "Up to date."}
          />
        ) : undefined
      }
    >
      <div className="space-y-8 py-4">
        {/* STOREFRONT WIDGET */}
        <FormSection title="Storefront Widget" description="Control chat visibility, welcome messages, and guest limits.">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-5">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <ToggleRow
                label="Enable Widget"
                description="Show floating chat button."
                checked={draft.enabled}
                onChange={(value) => setField("enabled", value)}
              />
              <ToggleRow
                label="Attachments"
                description="Allow image/file uploads."
                checked={draft.attachmentsEnabled}
                onChange={(value) => setField("attachmentsEnabled", value)}
                disabled={!draft.enabled}
              />
              <NumberField
                label="Free Msg Limit"
                value={draft.guestMessageLimit}
                onChange={(value) => setField("guestMessageLimit", value)}
                min={1}
                max={100}
                disabled={!draft.enabled}
                hint="Max messages before sign-in."
              />
              <NumberField
                label="Cookie Lifetime"
                value={draft.guestThreadTokenDays}
                onChange={(value) => setField("guestThreadTokenDays", value)}
                suffix="days"
                min={1}
                max={365}
                disabled={!draft.enabled}
                hint="Keep anonymous threads."
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <TextArea
                label="Guest Welcome Message"
                rows={3}
                value={draft.welcomeMessageGuest}
                onChange={(event) => setField("welcomeMessageGuest", event.target.value)}
                disabled={!draft.enabled}
                placeholder={CHAT_WELCOME_GUEST_DEFAULT}
                hint="Use {limit} to show message limit."
              />
              <TextArea
                label="Customer Welcome Message"
                rows={3}
                value={draft.welcomeMessageCustomer}
                onChange={(event) => setField("welcomeMessageCustomer", event.target.value)}
                disabled={!draft.enabled}
                placeholder={CHAT_WELCOME_CUSTOMER_DEFAULT}
              />
            </div>
          </div>
        </FormSection>

        {/* AI ASSISTANT */}
        <FormSection title="AI Assistant" description="Configure automated replies and connect your preferred LLM provider.">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-5">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <ToggleRow
                label="Enable AI Replies"
                description="Instantly respond to messages."
                checked={draft.assistantEnabled}
                onChange={(value) => setField("assistantEnabled", value)}
                disabled={!draft.enabled}
              />
              <SelectField
                label="Live Provider"
                value={draft.assistantProvider}
                onChange={(event) =>
                  setField("assistantProvider", event.target.value === "google" ? "google" : "openai")
                }
                disabled={!draft.enabled || !draft.assistantEnabled}
                options={[
                  { value: "openai", label: CHAT_ASSISTANT_PROVIDER_LABELS.openai },
                  { value: "google", label: CHAT_ASSISTANT_PROVIDER_LABELS.google },
                ]}
              />
              <div className="lg:col-span-2">
                <TextField
                  label="Bot Display Name"
                  value={draft.assistantName}
                  onChange={(event) => setField("assistantName", event.target.value)}
                  placeholder={CHAT_ASSISTANT_DEFAULT_NAME}
                  disabled={!draft.enabled || !draft.assistantEnabled}
                />
              </div>
            </div>

            {draft.assistantEnabled && draft.enabled && (
              <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] p-4">
                <h4 className="mb-4 text-sm font-semibold text-[var(--color-ink-900)]">
                  {draft.assistantProvider === "openai" ? "OpenAI Settings" : "Google Gemini Settings"}
                </h4>
                <div className="grid gap-6 lg:grid-cols-2">
                  <TextField
                    label="API Key"
                    type="password"
                    value={draft.assistantProvider === "openai" ? draft.providerApiKeyOpenai : draft.providerApiKeyGoogle}
                    onChange={(event) =>
                      setField(
                        draft.assistantProvider === "openai" ? "providerApiKeyOpenai" : "providerApiKeyGoogle",
                        event.target.value
                      )
                    }
                    placeholder={
                      providers?.[draft.assistantProvider].configured && !(draft.assistantProvider === "openai" ? draft.providerApiKeyOpenai : draft.providerApiKeyGoogle)
                        ? "•••••••••••• (Using .env fallback)"
                        : "Enter API Key"
                    }
                    disabled={!draft.enabled || !draft.assistantEnabled}
                  />
                  <TextField
                    label="Model ID"
                    value={draft.assistantProvider === "openai" ? draft.assistantModelOpenai : draft.assistantModelGoogle}
                    onChange={(event) =>
                      setField(
                        draft.assistantProvider === "openai" ? "assistantModelOpenai" : "assistantModelGoogle",
                        event.target.value
                      )
                    }
                    placeholder={CHAT_ASSISTANT_DEFAULT_MODELS[draft.assistantProvider]}
                    hint={`Leave blank for default.`}
                    disabled={!draft.enabled || !draft.assistantEnabled}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField
                label="Temperature"
                value={draft.assistantTemperature}
                onChange={(value) => setField("assistantTemperature", value)}
                min={0}
                max={1}
                step={0.05}
                disabled={!draft.enabled || !draft.assistantEnabled}
                hint="0 to 1. Higher is more creative."
              />
              <NumberField
                label="Max Tokens"
                value={draft.assistantMaxTokens}
                onChange={(value) => setField("assistantMaxTokens", value)}
                min={100}
                max={2000}
                disabled={!draft.enabled || !draft.assistantEnabled}
                hint="Max length of response."
              />
              <NumberField
                label="History Turns"
                value={draft.assistantHistoryTurns}
                onChange={(value) => setField("assistantHistoryTurns", value)}
                min={2}
                max={24}
                disabled={!draft.enabled || !draft.assistantEnabled}
                hint="Past messages to remember."
              />
              <NumberField
                label="Catalog Matches"
                value={draft.assistantCatalogLimit}
                onChange={(value) => setField("assistantCatalogLimit", value)}
                min={1}
                max={20}
                disabled={!draft.enabled || !draft.assistantEnabled}
                hint="Max products to search."
              />
            </div>

            <div className="mt-6">
              <TextArea
                label="Custom Training Notes & Knowledge"
                rows={4}
                value={draft.assistantTrainingNotes}
                onChange={(event) => setField("assistantTrainingNotes", event.target.value)}
                disabled={!draft.enabled || !draft.assistantEnabled}
                placeholder="E.g., We offer same-day delivery if ordered before 2 PM."
                hint="Injected into every prompt. Max 4,000 characters."
              />
            </div>
          </div>
        </FormSection>
      </div>
    </SettingsFormPanel>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, description, checked, onChange, disabled = false }: ToggleRowProps) {
  return (
    <div
      className={classNames(
        "flex flex-col gap-1.5",
        disabled && "opacity-60"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-[var(--color-ink-900)]">{label}</p>
        <Toggle
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--color-ink-500)]">{description}</p>
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  disabled?: boolean;
}

function NumberField({ label, value, onChange, suffix, min, max, step, hint, disabled = false }: NumberFieldProps) {
  return (
    <label className={classNames("flex flex-col gap-1.5", disabled && "opacity-60")}>
      <span className="block text-sm font-semibold text-[var(--color-ink-900)]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className="h-8 flex-1 min-w-0 rounded border border-[var(--color-ink-200)] px-2 text-sm text-[var(--color-ink-900)] focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-500)]"
        />
        {suffix && <span className="text-xs text-[var(--color-ink-500)]">{suffix}</span>}
      </div>
      {hint && <p className="text-[11px] text-[var(--color-ink-500)]">{hint}</p>}
    </label>
  );
}
