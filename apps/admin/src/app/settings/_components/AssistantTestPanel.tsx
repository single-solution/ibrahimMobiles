"use client";

import { useState } from "react";

import {
  CHAT_ASSISTANT_PROVIDER_LABELS,
  type ChatAssistantProvider,
  type ChatSettingsValues,
} from "@store/shared";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/forms/SelectField";
import { useToast } from "@/components/ui/Toast";

interface AssistantTestResult {
  reply: string;
  provider: ChatAssistantProvider;
  model: string;
  latencyMs: number;
  unsafe: boolean;
}

interface AssistantTestPanelProps {
  assistantName: string;
  savedProvider: ChatAssistantProvider;
  draftSettings: ChatSettingsValues;
  disabled?: boolean;
}

export function AssistantTestPanel({
  assistantName,
  savedProvider,
  draftSettings,
  disabled = false,
}: AssistantTestPanelProps) {
  const toast = useToast();
  const [message, setMessage] = useState("What's in stock right now?");
  const [testProvider, setTestProvider] = useState<ChatAssistantProvider | "both">(
    savedProvider,
  );
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<AssistantTestResult[]>([]);

  async function runTest(provider: ChatAssistantProvider) {
    const response = await apiFetch<{
      reply: string;
      provider: ChatAssistantProvider;
      model: string;
      latencyMs: number;
      unsafe: boolean;
    }>("/api/chat/assistant-test", {
      method: "POST",
      json: {
        message,
        provider,
        assistantName,
        draft: {
          assistantProvider: draftSettings.assistantProvider,
          assistantModelOpenai: draftSettings.assistantModelOpenai,
          assistantModelGoogle: draftSettings.assistantModelGoogle,
          assistantTrainingNotes: draftSettings.assistantTrainingNotes,
          assistantTemperature: draftSettings.assistantTemperature,
          assistantMaxTokens: draftSettings.assistantMaxTokens,
          assistantHistoryTurns: draftSettings.assistantHistoryTurns,
          assistantCatalogLimit: draftSettings.assistantCatalogLimit,
        },
      },
    });
    return {
      reply: response.reply,
      provider: response.provider,
      model: response.model,
      latencyMs: response.latencyMs,
      unsafe: response.unsafe,
    };
  }

  async function handleTest() {
    if (message.trim().length < 2) {
      toast.danger("Enter a sample customer message.");
      return;
    }
    setIsTesting(true);
    setResults([]);
    try {
      const providers: ChatAssistantProvider[] =
        testProvider === "both" ? ["openai", "google"] : [testProvider];
      const next = await Promise.all(providers.map((provider) => runTest(provider)));
      setResults(next);
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "Assistant test failed.",
      );
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-md)] border border-dashed border-[var(--color-accent-300)] bg-[var(--color-accent-50)] p-4">
      <div>
        <p className="text-sm font-semibold text-[var(--color-ink-900)]">
          Test response
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-ink-600)]">
          Uses your current draft settings (including unsaved changes), live catalog
          context, and the same guardrails as production.
        </p>
      </div>
      <label className="block text-xs font-medium text-[var(--color-ink-700)]">
        Sample customer message
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          maxLength={500}
          disabled={disabled || isTesting}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink-800)] focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-300)] disabled:opacity-50"
        />
      </label>
      <SelectField
        label="Test with"
        value={testProvider}
        onChange={(event) =>
          setTestProvider(
            event.target.value === "both"
              ? "both"
              : event.target.value === "google"
                ? "google"
                : "openai",
          )
        }
        disabled={disabled || isTesting}
        options={[
          { value: "openai", label: CHAT_ASSISTANT_PROVIDER_LABELS.openai },
          { value: "google", label: CHAT_ASSISTANT_PROVIDER_LABELS.google },
          { value: "both", label: "Compare both side-by-side" },
        ]}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={handleTest}
        isLoading={isTesting}
        disabled={disabled}
      >
        Run test
      </Button>
      {results.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((result) => (
            <div
              key={result.provider}
              className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                {CHAT_ASSISTANT_PROVIDER_LABELS[result.provider]}
                {result.provider === savedProvider ? " · live provider" : ""}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink-800)]">
                {result.reply}
              </p>
              <p className="mt-2 text-[10px] text-[var(--color-ink-500)]">
                {result.model} · {result.latencyMs}ms
                {result.unsafe ? " · blocked in production" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
