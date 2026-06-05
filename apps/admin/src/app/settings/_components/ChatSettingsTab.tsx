"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { FormSection } from "@/components/forms/FormSection";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { Switch } from "@/components/forms/Switch";
import {
  SettingsFormPanel,
  SettingsLoadingPanel,
  SettingsSaveFooter,
} from "@/app/settings/_components/settingsWorkspaceUi";
import { useToast } from "@/components/ui/Toast";
import {
  ASSISTANT_CORE_RULES,
  STORE_HOW_IT_WORKS,
  CHAT_ASSISTANT_DEFAULT_MODELS,
  CHAT_ASSISTANT_DEFAULT_NAME,
  CHAT_ASSISTANT_PROVIDER_LABELS,
  CHAT_SETTING_DEFAULTS,
  CHAT_WELCOME_CUSTOMER_DEFAULT,
  CHAT_WELCOME_GUEST_DEFAULT,
  classNames,
  DEFAULT_ASSISTANT_INSTRUCTIONS,
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
      <div className="py-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
          <Switch
            label="Enable Widget"
            description="Show floating chat button."
            checked={draft.enabled}
            onCheckedChange={(value) => setField("enabled", value)}
          />
          <Switch
            label="Idle Nudge"
            description="Teaser bubble when a visitor lingers."
            checked={draft.proactiveNudgeEnabled}
            onCheckedChange={(value) => setField("proactiveNudgeEnabled", value)}
            disabled={!draft.enabled}
          />
          <NumberField
            label="Nudge After"
            value={draft.proactiveNudgeMinutes}
            onChange={(value) => setField("proactiveNudgeMinutes", value)}
            suffix="min"
            min={1}
            max={60}
            disabled={!draft.enabled || !draft.proactiveNudgeEnabled}
            hint="Idle minutes before the nudge."
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

          <Switch
            label="Enable AI Replies"
            description="Instantly respond to messages."
            checked={draft.assistantEnabled}
            onCheckedChange={(value) => setField("assistantEnabled", value)}
            disabled={!draft.enabled}
          />
          <SelectField
            label="Live Provider"
            value={draft.assistantProvider}
            onChange={(event) =>
              setField(
                "assistantProvider",
                event.target.value === "google"
                  ? "google"
                  : event.target.value === "anthropic"
                    ? "anthropic"
                    : "openai"
              )
            }
            disabled={!draft.enabled || !draft.assistantEnabled}
            options={[
              { value: "openai", label: CHAT_ASSISTANT_PROVIDER_LABELS.openai },
              { value: "google", label: CHAT_ASSISTANT_PROVIDER_LABELS.google },
              { value: "anthropic", label: CHAT_ASSISTANT_PROVIDER_LABELS.anthropic },
            ]}
          />
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

          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <TextField
              label="Bot Display Name"
              value={draft.assistantName}
              onChange={(event) => setField("assistantName", event.target.value)}
              placeholder={CHAT_ASSISTANT_DEFAULT_NAME}
              disabled={!draft.enabled || !draft.assistantEnabled}
            />
          </div>

          {draft.assistantEnabled && draft.enabled && (
            <>
              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
                <TextField
                  label={`${
                    draft.assistantProvider === "openai"
                      ? "OpenAI"
                      : draft.assistantProvider === "anthropic"
                        ? "Anthropic"
                        : "Google Gemini"
                  } API Key`}
                  type="password"
                  value={
                    draft.assistantProvider === "openai"
                      ? draft.providerApiKeyOpenai
                      : draft.assistantProvider === "anthropic"
                        ? draft.providerApiKeyAnthropic
                        : draft.providerApiKeyGoogle
                  }
                  onChange={(event) =>
                    setField(
                      draft.assistantProvider === "openai"
                        ? "providerApiKeyOpenai"
                        : draft.assistantProvider === "anthropic"
                          ? "providerApiKeyAnthropic"
                          : "providerApiKeyGoogle",
                      event.target.value
                    )
                  }
                  placeholder={
                    providers?.[draft.assistantProvider].configured &&
                    !(
                      draft.assistantProvider === "openai"
                        ? draft.providerApiKeyOpenai
                        : draft.assistantProvider === "anthropic"
                          ? draft.providerApiKeyAnthropic
                          : draft.providerApiKeyGoogle
                    )
                      ? "•••••••••••• (Using .env fallback)"
                      : "Enter API Key"
                  }
                  disabled={!draft.enabled || !draft.assistantEnabled}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                <TextField
                  label="Model ID"
                  value={
                    draft.assistantProvider === "openai"
                      ? draft.assistantModelOpenai
                      : draft.assistantProvider === "anthropic"
                        ? draft.assistantModelAnthropic
                        : draft.assistantModelGoogle
                  }
                  onChange={(event) =>
                    setField(
                      draft.assistantProvider === "openai"
                        ? "assistantModelOpenai"
                        : draft.assistantProvider === "anthropic"
                          ? "assistantModelAnthropic"
                          : "assistantModelGoogle",
                      event.target.value
                    )
                  }
                  placeholder={CHAT_ASSISTANT_DEFAULT_MODELS[draft.assistantProvider]}
                  hint={`Leave blank for default.`}
                  disabled={!draft.enabled || !draft.assistantEnabled}
                />
              </div>
            </>
          )}

          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <TextArea
              label="Guest Welcome Message"
              rows={3}
              value={draft.welcomeMessageGuest}
              onChange={(event) => setField("welcomeMessageGuest", event.target.value)}
              disabled={!draft.enabled}
              placeholder={CHAT_WELCOME_GUEST_DEFAULT}
              hint="Use {limit} to show message limit."
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <TextArea
              label="Customer Welcome Message"
              rows={3}
              value={draft.welcomeMessageCustomer}
              onChange={(event) => setField("welcomeMessageCustomer", event.target.value)}
              disabled={!draft.enabled}
              placeholder={CHAT_WELCOME_CUSTOMER_DEFAULT}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <div className="mb-3 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-canvas)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
                Always enforced (built-in — cannot be edited)
              </p>
              <ul className="mt-2 space-y-1.5">
                {ASSISTANT_CORE_RULES.map((rule) => (
                  <li
                    key={rule}
                    className="flex gap-2 text-[11.5px] leading-relaxed text-[var(--color-ink-600)]"
                  >
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--color-accent-500)]" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
                Store knowledge the bot always has (built-in)
              </p>
              <ul className="mt-2 space-y-1.5">
                {STORE_HOW_IT_WORKS.map((fact) => (
                  <li
                    key={fact}
                    className="flex gap-2 text-[11.5px] leading-relaxed text-[var(--color-ink-600)]"
                  >
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--color-ink-300)]" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
            <TextArea
              label="Assistant instructions"
              rows={18}
              value={draft.assistantInstructions || DEFAULT_ASSISTANT_INSTRUCTIONS}
              onChange={(event) => setField("assistantInstructions", event.target.value)}
              disabled={!draft.enabled || !draft.assistantEnabled}
              hint="How the bot talks and sells. Edit freely or add store-specific notes (promos, which models to push). The built-in rules above always apply. Leave matching the default to keep the standard playbook."
            />
            {!readOnly &&
            draft.assistantInstructions.trim() &&
            draft.assistantInstructions !== DEFAULT_ASSISTANT_INSTRUCTIONS ? (
              <button
                type="button"
                onClick={() => setField("assistantInstructions", "")}
                className="mt-1.5 text-[11px] font-semibold text-[var(--color-accent-700)] hover:text-[var(--color-accent-800)]"
              >
                Reset to default playbook
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </SettingsFormPanel>
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
