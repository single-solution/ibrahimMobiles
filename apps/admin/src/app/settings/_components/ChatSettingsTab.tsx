"use client";

/**
 * Admin inquiry widget + automated reply settings.
 * Reads/writes via `/api/settings/chat` (typed bulk save + cache bust).
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Users,
} from "lucide-react";

import { adminFetch } from "@/lib/adminApi";
import { FormSection } from "@/components/forms/FormSection";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import {
  SettingsFormPanel,
  SettingsLoadingPanel,
  SettingsSaveFooter,
} from "@/app/settings/_components/settingsWorkspaceUi";
import { useToast } from "@/components/ui/Toast";
import { AssistantTestPanel } from "@/app/settings/_components/AssistantTestPanel";
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
  const [providers, setProviders] = useState<
    ChatSettingsResponse["providers"] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await adminFetch<ChatSettingsResponse>("/api/settings/chat");
        if (cancelled) return;
        setDraft(data.settings);
        setSaved(data.settings);
        setProviders(data.providers);
      } catch (error) {
        toast.danger(
          error instanceof Error ? error.message : "Failed to load inquiry settings",
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

  const activeProviderReady = providers
    ? providers[draft.assistantProvider].configured
    : false;

  const statusItems = useMemo(
    () => [
      {
        label: "Storefront widget",
        ok: draft.enabled,
        detail: draft.enabled ? "Visible on site" : "Hidden from customers",
      },
      {
        label: "Automated replies",
        ok: draft.assistantEnabled && draft.enabled,
        detail:
          !draft.enabled
            ? "Widget is off"
            : draft.assistantEnabled
              ? activeProviderReady
                ? "Live on storefront"
                : "Enabled — API key missing"
              : "Manual replies only",
      },
      {
        label: CHAT_ASSISTANT_PROVIDER_LABELS.openai,
        ok: providers?.openai.configured ?? false,
        detail: providers?.openai.model ?? CHAT_ASSISTANT_DEFAULT_MODELS.openai,
      },
      {
        label: CHAT_ASSISTANT_PROVIDER_LABELS.google,
        ok: providers?.google.configured ?? false,
        detail: providers?.google.model ?? CHAT_ASSISTANT_DEFAULT_MODELS.google,
      },
    ],
    [activeProviderReady, draft.assistantEnabled, draft.enabled, providers],
  );

  function setField<K extends keyof ChatSettingsValues>(
    field: K,
    value: ChatSettingsValues[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    if (isSaving || !isDirty) return;
    setIsSaving(true);
    try {
      const data = await adminFetch<ChatSettingsResponse>("/api/settings/chat", {
        method: "PUT",
        json: draft,
      });
      setDraft(data.settings);
      setSaved(data.settings);
      setProviders(data.providers);
      toast.success("Inquiry settings saved");
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "Failed to save inquiry settings",
      );
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
            hint={
              isDirty
                ? "You have unsaved chat widget changes."
                : "Up to date — storefront picks up changes within seconds."
            }
          />
        ) : undefined
      }
    >
      <div className="space-y-6 py-2">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">
              Storefront chat
            </p>
            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-[var(--color-ink-500)]">
              Floating widget, account messages, and optional AI replies. Customers start
              threads from the website — not from this screen.
            </p>
          </div>
          <Link
            href="/inquiries"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-800)] transition-colors hover:border-[var(--color-accent-300)] hover:text-[var(--color-accent-800)]"
          >
            <Users size={13} />
            Open inbox
            <ExternalLink size={11} className="opacity-60" />
          </Link>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {statusItems.map((item) => (
            <StatusCard
              key={item.label}
              label={item.label}
              detail={item.detail}
              ok={item.ok}
            />
          ))}
        </div>

        {draft.assistantEnabled && draft.enabled && !activeProviderReady && (
          <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-warn-200)] bg-[var(--color-warn-50)] px-4 py-3 text-xs text-[var(--color-warn-900)]">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <p>
              Automated replies are on but{" "}
              <strong>{CHAT_ASSISTANT_PROVIDER_LABELS[draft.assistantProvider]}</strong>{" "}
              is not configured. Add{" "}
              {draft.assistantProvider === "google"
                ? "GOOGLE_AI_API_KEY"
                : "OPENAI_API_KEY"}{" "}
              to the server environment, or switch provider.
            </p>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <FormSection
            title="Storefront widget"
            description="Master controls for the floating inquiry button and account messages page."
          >
          <ToggleRow
            label="Inquiries enabled"
            description="When off, the widget is hidden and account messages are unavailable."
            checked={draft.enabled}
            onChange={(value) => setField("enabled", value)}
          />
          <ToggleRow
            label="Attachments enabled"
            description="Allow customers to upload images and files in the composer."
            checked={draft.attachmentsEnabled}
            onChange={(value) => setField("attachmentsEnabled", value)}
            disabled={!draft.enabled}
          />
          </FormSection>

          <FormSection
            title="Welcome messages"
          description="Shown when a thread has no messages yet. Use {limit} in the guest message for the preview cap."
        >
          <TextArea
            label="Guest welcome (widget)"
            rows={4}
            value={draft.welcomeMessageGuest}
            onChange={(event) => setField("welcomeMessageGuest", event.target.value)}
            disabled={!draft.enabled}
            placeholder={CHAT_WELCOME_GUEST_DEFAULT}
            hint={`Default: ${CHAT_WELCOME_GUEST_DEFAULT.slice(0, 80)}…`}
          />
          <TextArea
            label="Signed-in customer welcome"
            rows={3}
            value={draft.welcomeMessageCustomer}
            onChange={(event) =>
              setField("welcomeMessageCustomer", event.target.value)
            }
            disabled={!draft.enabled}
            placeholder={CHAT_WELCOME_CUSTOMER_DEFAULT}
            hint={`Default: ${CHAT_WELCOME_CUSTOMER_DEFAULT.slice(0, 80)}…`}
          />
          </FormSection>
        </div>

        <FormSection
          title="Automated inquiry bot"
          description="Configure both LLM providers, training knowledge, generation parameters, and what context the bot receives from your store."
        >
          <div className="grid gap-3 lg:grid-cols-3">
            <ToggleRow
              label="Automated replies enabled"
              description="Instant AI replies on new customer messages. Your team can join any thread from the inbox."
              checked={draft.assistantEnabled}
              onChange={(value) => setField("assistantEnabled", value)}
              disabled={!draft.enabled}
            />
            <div className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3 lg:col-span-2">
              <SelectField
                label="Live provider"
                value={draft.assistantProvider}
                onChange={(event) =>
                  setField(
                    "assistantProvider",
                    event.target.value === "google" ? "google" : "openai",
                  )
                }
                disabled={!draft.enabled || !draft.assistantEnabled}
                hint="Which model handles production replies. You can test both below."
                options={[
                  {
                    value: "openai",
                    label: `${CHAT_ASSISTANT_PROVIDER_LABELS.openai}${
                      providers?.openai.configured ? "" : " — API key missing"
                    }`,
                  },
                  {
                    value: "google",
                    label: `${CHAT_ASSISTANT_PROVIDER_LABELS.google}${
                      providers?.google.configured ? "" : " — API key missing"
                    }`,
                  },
                ]}
              />
              <div className="mt-3">
                <TextField
                  label="Storefront display name"
                  value={draft.assistantName}
                  onChange={(event) => setField("assistantName", event.target.value)}
                  placeholder={CHAT_ASSISTANT_DEFAULT_NAME}
                  hint="Shown in the widget header and on automated replies. Keep neutral — no person names."
                  disabled={!draft.enabled || !draft.assistantEnabled}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ModelProviderCard
              provider="openai"
              label={CHAT_ASSISTANT_PROVIDER_LABELS.openai}
              configured={providers?.openai.configured ?? false}
              effectiveModel={
                draft.assistantModelOpenai.trim() ||
                providers?.openai.model ||
                CHAT_ASSISTANT_DEFAULT_MODELS.openai
              }
              defaultModel={CHAT_ASSISTANT_DEFAULT_MODELS.openai}
              modelValue={draft.assistantModelOpenai}
              isLive={draft.assistantProvider === "openai"}
              disabled={!draft.enabled || !draft.assistantEnabled}
              envHint="OPENAI_API_KEY · OPENAI_CHAT_MODEL"
              onModelChange={(value) => setField("assistantModelOpenai", value)}
            />
            <ModelProviderCard
              provider="google"
              label={CHAT_ASSISTANT_PROVIDER_LABELS.google}
              configured={providers?.google.configured ?? false}
              effectiveModel={
                draft.assistantModelGoogle.trim() ||
                providers?.google.model ||
                CHAT_ASSISTANT_DEFAULT_MODELS.google
              }
              defaultModel={CHAT_ASSISTANT_DEFAULT_MODELS.google}
              modelValue={draft.assistantModelGoogle}
              isLive={draft.assistantProvider === "google"}
              disabled={!draft.enabled || !draft.assistantEnabled}
              envHint="GOOGLE_AI_API_KEY · GEMINI_CHAT_MODEL"
              onModelChange={(value) => setField("assistantModelGoogle", value)}
            />
          </div>

          <TextArea
            label="Bot training & reference notes"
            rows={8}
            value={draft.assistantTrainingNotes}
            onChange={(event) => setField("assistantTrainingNotes", event.target.value)}
            disabled={!draft.enabled || !draft.assistantEnabled}
            placeholder={`Examples:\n• Grade A = like new, Grade B = light wear, Grade C = visible marks.\n• Same-day pickup available at the store before 4pm.\n• Trade-ins accepted in-store only — ask for human support.`}
            hint="Injected into every bot prompt as verified store knowledge. Use for FAQs, tone, policies not in catalog, and things the bot must always remember. Max 4,000 characters."
          />

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Generation parameters
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <NumberField
                label="Temperature"
                value={draft.assistantTemperature}
                onChange={(value) => setField("assistantTemperature", value)}
                min={0}
                max={1}
                step={0.05}
                disabled={!draft.enabled || !draft.assistantEnabled}
                hint="Lower = more factual. Default 0.38"
              />
              <NumberField
                label="Max output tokens"
                value={draft.assistantMaxTokens}
                onChange={(value) => setField("assistantMaxTokens", value)}
                suffix="tokens"
                min={100}
                max={2_000}
                disabled={!draft.enabled || !draft.assistantEnabled}
                hint="Reply length cap per message"
              />
              <NumberField
                label="History turns"
                value={draft.assistantHistoryTurns}
                onChange={(value) => setField("assistantHistoryTurns", value)}
                suffix="turns"
                min={2}
                max={24}
                disabled={!draft.enabled || !draft.assistantEnabled}
                hint="Prior customer + bot messages sent to the model"
              />
              <NumberField
                label="Catalog matches"
                value={draft.assistantCatalogLimit}
                onChange={(value) => setField("assistantCatalogLimit", value)}
                suffix="products"
                min={1}
                max={20}
                disabled={!draft.enabled || !draft.assistantEnabled}
                hint="Max products injected from live search"
              />
            </div>
          </div>

          <BotKnowledgeReference
            catalogLimit={draft.assistantCatalogLimit}
            historyTurns={draft.assistantHistoryTurns}
            hasTrainingNotes={draft.assistantTrainingNotes.trim().length > 0}
          />

          <AssistantTestPanel
            assistantName={draft.assistantName}
            savedProvider={draft.assistantProvider}
            draftSettings={draft}
            disabled={!draft.enabled || !draft.assistantEnabled}
          />
        </FormSection>

        <FormSection
          title="Advanced — transport & guests"
          description="Polling intervals, optional WebSocket broker, and anonymous guest sessions."
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <ToggleRow
              label="Live mode (WebSocket)"
              description="When on and a broker URL is set, clients try WebSocket first, then fall back to polling."
              checked={draft.liveModeEnabled}
              onChange={(value) => setField("liveModeEnabled", value)}
              disabled={!draft.enabled}
            />
            <TextField
              label="WebSocket URL"
              value={draft.websocketUrl}
              onChange={(event) => setField("websocketUrl", event.target.value)}
              placeholder="wss://chat.example.com"
              hint="Leave empty to use polling only."
              disabled={!draft.enabled}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField
              label="Polling interval (focused tab)"
              value={draft.pollIntervalMsFocused}
              onChange={(value) => setField("pollIntervalMsFocused", value)}
              suffix="ms"
              min={1_000}
              max={60_000}
              disabled={!draft.enabled}
            />
            <NumberField
              label="Polling interval (background tab)"
              value={draft.pollIntervalMsBlurred}
              onChange={(value) => setField("pollIntervalMsBlurred", value)}
              suffix="ms"
              min={5_000}
              max={300_000}
              disabled={!draft.enabled}
            />
            <NumberField
              label="Guest cookie lifetime"
              value={draft.guestThreadTokenDays}
              onChange={(value) => setField("guestThreadTokenDays", value)}
              suffix="days"
              min={1}
              max={365}
              disabled={!draft.enabled}
            />
          </div>
        </FormSection>
      </div>
    </SettingsFormPanel>
  );
}

function StatusCard({
  label,
  detail,
  ok,
}: {
  label: string;
  detail: string;
  ok: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2.5">
      <div className="flex items-start gap-2">
        {ok ? (
          <CheckCircle2
            size={14}
            className="mt-0.5 shrink-0 text-[var(--color-success-600)]"
          />
        ) : (
          <AlertTriangle
            size={14}
            className="mt-0.5 shrink-0 text-[var(--color-warn-600)]"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-[var(--color-ink-900)]">
            {label}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-[var(--color-ink-500)]">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleRowProps) {
  return (
    <label
      className={classNames(
        "flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
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
  step?: number;
  hint?: string;
  disabled?: boolean;
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
  step,
  hint,
  disabled = false,
}: NumberFieldProps) {
  return (
    <label className={classNames("block", disabled && "opacity-60")}>
      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {label}
      </span>
      <div className="mt-1 flex items-center gap-2">
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
          className="h-9 flex-1 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink-800)] focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-300)] disabled:cursor-not-allowed"
        />
        {suffix && (
          <span className="text-xs text-[var(--color-ink-500)]">{suffix}</span>
        )}
      </div>
      {hint ? (
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-ink-500)]">
          {hint}
        </p>
      ) : null}
    </label>
  );
}

interface ModelProviderCardProps {
  provider: ChatAssistantProvider;
  label: string;
  configured: boolean;
  effectiveModel: string;
  defaultModel: string;
  modelValue: string;
  isLive: boolean;
  envHint: string;
  disabled?: boolean;
  onModelChange: (value: string) => void;
}

function ModelProviderCard({
  label,
  configured,
  effectiveModel,
  defaultModel,
  modelValue,
  isLive,
  envHint,
  disabled = false,
  onModelChange,
}: ModelProviderCardProps) {
  return (
    <div
      className={classNames(
        "rounded-[var(--radius-md)] border bg-[var(--color-surface)] p-4",
        isLive
          ? "border-[var(--color-accent-300)] ring-1 ring-[var(--color-accent-200)]"
          : "border-[var(--color-ink-100)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] text-[var(--color-accent-700)]">
            <Cpu size={15} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">{label}</p>
            <p className="mt-0.5 text-[10px] text-[var(--color-ink-500)]">{envHint}</p>
          </div>
        </div>
        <span
          className={classNames(
            "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
            configured
              ? "bg-[var(--color-success-50)] text-[var(--color-success-700)]"
              : "bg-[var(--color-warn-50)] text-[var(--color-warn-800)]",
          )}
        >
          {configured ? "API ready" : "No API key"}
        </span>
      </div>

      {isLive ? (
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent-700)]">
          Live production provider
        </p>
      ) : null}

      <div className="mt-3">
        <TextField
          label="Model ID"
          value={modelValue}
          onChange={(event) => onModelChange(event.target.value)}
          placeholder={defaultModel}
          hint={`Effective: ${effectiveModel}. Leave blank to use env default (${defaultModel}).`}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function BotKnowledgeReference({
  catalogLimit,
  historyTurns,
  hasTrainingNotes,
}: {
  catalogLimit: number;
  historyTurns: number;
  hasTrainingNotes: boolean;
}) {
  const items = [
    "Store name, tagline, phone, email, address, and hours (from Store settings)",
    "Active product categories",
    `Up to ${catalogLimit} catalog products matched from the customer's message (live prices, stock, grades, /shop links)`,
    "Subject product when the chat was opened from a product page",
    "Warranty, returns, delivery threshold, loyalty earn rate, and payment methods",
    "Built-in safety rules: no competitor mentions, no external URLs, no invented prices",
    ...(hasTrainingNotes
      ? ["Your custom training & reference notes (above)"]
      : ["Custom training notes — add above to teach store-specific FAQs"]),
  ];

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-4">
      <div className="flex items-start gap-2">
        <BookOpen size={15} className="mt-0.5 shrink-0 text-[var(--color-accent-700)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink-900)]">
            What the bot knows each reply
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">
            Injected automatically — the model cannot access anything outside this list.
            Conversation memory: last {historyTurns} customer + bot turns.
          </p>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-[11px] leading-relaxed text-[var(--color-ink-700)]"
              >
                <CheckCircle2
                  size={12}
                  className="mt-0.5 shrink-0 text-[var(--color-success-600)]"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
