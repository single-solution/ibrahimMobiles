"use client";

import { useMemo, useState } from "react";

import { STORE_SETTING_GROUPS, type StoreSettings } from "@store/shared";

import { Tabs } from "@/components/Tabs";
import { FormSection } from "@/components/forms/FormSection";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { SaveBar } from "@/components/forms/SaveBar";
import { useToast } from "@/components/Toast";

interface SettingsViewProps {
  initialSettings: StoreSettings;
}

export function SettingsView({ initialSettings }: SettingsViewProps) {
  const [savedSettings, setSavedSettings] = useState<StoreSettings>(initialSettings);
  const [draft, setDraft] = useState<StoreSettings>(initialSettings);

  function setField<K extends keyof StoreSettings>(field: K, value: StoreSettings[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <Tabs
      tabs={[
        {
          id: "general",
          label: "General",
          content: (
            <GeneralSettings
              draft={draft}
              saved={savedSettings}
              setField={setField}
              onSaved={setSavedSettings}
            />
          ),
        },
        {
          id: "contact",
          label: "Contact",
          content: (
            <ContactSettings
              draft={draft}
              saved={savedSettings}
              setField={setField}
              onSaved={setSavedSettings}
            />
          ),
        },
        {
          id: "payments",
          label: "Payments",
          content: (
            <PaymentSettings
              draft={draft}
              saved={savedSettings}
              setField={setField}
              onSaved={setSavedSettings}
            />
          ),
        },
        {
          id: "delivery",
          label: "Delivery",
          content: (
            <DeliverySettings
              draft={draft}
              saved={savedSettings}
              setField={setField}
              onSaved={setSavedSettings}
            />
          ),
        },
        {
          id: "social",
          label: "Social",
          content: (
            <SocialSettings
              draft={draft}
              saved={savedSettings}
              setField={setField}
              onSaved={setSavedSettings}
            />
          ),
        },
        {
          id: "policies",
          label: "Policies",
          content: (
            <PolicySettings
              draft={draft}
              saved={savedSettings}
              setField={setField}
              onSaved={setSavedSettings}
            />
          ),
        },
      ]}
    />
  );
}

interface SectionProps {
  draft: StoreSettings;
  saved: StoreSettings;
  setField<K extends keyof StoreSettings>(field: K, value: StoreSettings[K]): void;
  onSaved(settings: StoreSettings): void;
}

function GeneralSettings({ draft, saved, setField, onSaved }: SectionProps) {
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.branding}
      draft={draft}
      saved={saved}
      onSaved={onSaved}
    >
      <FormSection
        title="Site identity"
        description="The name and tagline that show up across the storefront, page titles, and the AI assistant greeting."
      >
        <TextField
          label="Site name"
          value={draft.siteName}
          onChange={(event) => setField("siteName", event.target.value)}
        />
        <TextArea
          label="Site tagline"
          rows={2}
          value={draft.siteTagline}
          onChange={(event) => setField("siteTagline", event.target.value)}
        />
      </FormSection>
    </SaveableSection>
  );
}

function ContactSettings({ draft, saved, setField, onSaved }: SectionProps) {
  const fields = useMemo(
    () => [...STORE_SETTING_GROUPS.contact, ...STORE_SETTING_GROUPS.address],
    [],
  );
  return (
    <SaveableSection fields={fields} draft={draft} saved={saved} onSaved={onSaved}>
      <FormSection
        title="Store contact"
        description="Used in the support strip, footer, AI chat replies, and order confirmation emails."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Support phone"
            value={draft.supportPhone}
            onChange={(event) => setField("supportPhone", event.target.value)}
          />
          <TextField
            label="Landline"
            value={draft.supportLandline}
            onChange={(event) => setField("supportLandline", event.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Support email"
            type="email"
            value={draft.supportEmail}
            onChange={(event) => setField("supportEmail", event.target.value)}
          />
          <TextField
            label="WhatsApp number (digits only, no plus)"
            value={draft.whatsappNumber}
            onChange={(event) => setField("whatsappNumber", event.target.value)}
            hint="International dialling format without the leading +."
          />
        </div>
      </FormSection>

      <FormSection title="Outlet address" description="Address shown on the about page and in the footer.">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Address line 1"
            value={draft.storeAddressLine1}
            onChange={(event) => setField("storeAddressLine1", event.target.value)}
          />
          <TextField
            label="Address line 2"
            value={draft.storeAddressLine2}
            onChange={(event) => setField("storeAddressLine2", event.target.value)}
          />
        </div>
        <TextField
          label="Store hours"
          value={draft.storeHours}
          onChange={(event) => setField("storeHours", event.target.value)}
        />
      </FormSection>
    </SaveableSection>
  );
}

function PaymentSettings({ draft, saved, setField, onSaved }: SectionProps) {
  return (
    <SaveableSection
      fields={["bankTransferDiscountPercent"] as const}
      draft={draft}
      saved={saved}
      onSaved={onSaved}
    >
      <FormSection title="Discounts" description="Order-wide discounts customers see at checkout.">
        <NumberField
          label="Bank transfer discount %"
          value={draft.bankTransferDiscountPercent}
          onChange={(value) => setField("bankTransferDiscountPercent", value)}
          trailingAddon="%"
        />
      </FormSection>
    </SaveableSection>
  );
}

function DeliverySettings({ draft, saved, setField, onSaved }: SectionProps) {
  return (
    <SaveableSection
      fields={["freeDeliveryThresholdRupees"] as const}
      draft={draft}
      saved={saved}
      onSaved={onSaved}
    >
      <FormSection
        title="Delivery rules"
        description="Free-delivery threshold applied to every storefront order."
      >
        <NumberField
          label="Free delivery over (Rs)"
          value={draft.freeDeliveryThresholdRupees}
          onChange={(value) => setField("freeDeliveryThresholdRupees", value)}
          trailingAddon="Rs"
        />
      </FormSection>
    </SaveableSection>
  );
}

function SocialSettings({ draft, saved, setField, onSaved }: SectionProps) {
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.social}
      draft={draft}
      saved={saved}
      onSaved={onSaved}
    >
      <FormSection title="Social profiles" description="Linked from the footer and about page.">
        <TextField
          label="Facebook URL"
          value={draft.socialFacebook}
          onChange={(event) => setField("socialFacebook", event.target.value)}
        />
        <TextField
          label="Instagram URL"
          value={draft.socialInstagram}
          onChange={(event) => setField("socialInstagram", event.target.value)}
        />
        <TextField
          label="TikTok URL"
          value={draft.socialTiktok}
          onChange={(event) => setField("socialTiktok", event.target.value)}
        />
        <TextField
          label="YouTube URL"
          value={draft.socialYoutube}
          onChange={(event) => setField("socialYoutube", event.target.value)}
        />
        <TextField
          label="Google Maps URL"
          value={draft.socialGoogleMaps}
          onChange={(event) => setField("socialGoogleMaps", event.target.value)}
        />
      </FormSection>
    </SaveableSection>
  );
}

function PolicySettings({ draft, saved, setField, onSaved }: SectionProps) {
  return (
    <SaveableSection
      fields={["moneybackDays", "defaultWarrantyMonths"] as const}
      draft={draft}
      saved={saved}
      onSaved={onSaved}
    >
      <FormSection
        title="Customer policies"
        description="Policy values surfaced on product pages, FAQs and dispatch confirmations."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Moneyback window (days)"
            value={draft.moneybackDays}
            onChange={(value) => setField("moneybackDays", value)}
          />
          <NumberField
            label="Default warranty (months)"
            value={draft.defaultWarrantyMonths}
            onChange={(value) => setField("defaultWarrantyMonths", value)}
          />
        </div>
      </FormSection>

    </SaveableSection>
  );
}

interface SaveableSectionProps {
  fields: ReadonlyArray<keyof StoreSettings>;
  draft: StoreSettings;
  saved: StoreSettings;
  onSaved(settings: StoreSettings): void;
  children: React.ReactNode;
}

function SaveableSection({ fields, draft, saved, onSaved, children }: SaveableSectionProps) {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = fields.some((field) => draft[field] !== saved[field]);

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
    <>
      <div className="space-y-1">{children}</div>
      <SaveBar
        onSave={handleSave}
        saveLabel={isSaving ? "Saving…" : isDirty ? "Save changes" : "Saved"}
        hint={
          isDirty
            ? "You have unsaved changes."
            : "Up to date — changes appear on the storefront within 60 seconds."
        }
      />
    </>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange(value: number): void;
  trailingAddon?: string;
}

function NumberField({ label, value, onChange, trailingAddon }: NumberFieldProps) {
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
    />
  );
}

