"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/admin/Tabs";
import { FormSection } from "@/components/admin/forms/FormSection";
import { TextField } from "@/components/admin/forms/TextField";
import { TextArea } from "@/components/admin/forms/TextArea";
import { SelectField } from "@/components/admin/forms/SelectField";
import { Switch } from "@/components/admin/forms/Switch";
import { SaveBar } from "@/components/admin/forms/SaveBar";
import { useToast } from "@/components/admin/Toast";
import {
  BANK_TRANSFER_DISCOUNT_PERCENT,
  DEFAULT_WARRANTY_MONTHS,
  FREE_DELIVERY_THRESHOLD_RUPEES,
  MONEYBACK_DAYS,
  PAYMENT_METHODS,
  SERVICE_CITIES,
  SITE_NAME,
  SITE_TAGLINE,
  SOCIAL_LINKS,
  STORE_ADDRESS_LINE_1,
  STORE_ADDRESS_LINE_2,
  STORE_HOURS,
  SUPPORT_EMAIL,
  SUPPORT_LANDLINE,
  SUPPORT_PHONE,
  WHATSAPP_NUMBER,
} from "@/lib/constants";

export function SettingsView() {
  return (
    <Tabs
      tabs={[
        { id: "general", label: "General", content: <GeneralSettings /> },
        { id: "contact", label: "Contact", content: <ContactSettings /> },
        { id: "payments", label: "Payments", content: <PaymentSettings /> },
        { id: "delivery", label: "Delivery", content: <DeliverySettings /> },
        { id: "social", label: "Social", content: <SocialSettings /> },
        { id: "policies", label: "Policies", content: <PolicySettings /> },
      ]}
    />
  );
}

function useSaveToast() {
  const toast = useToast();
  return () => toast.success("Settings saved");
}

function GeneralSettings() {
  const handleSave = useSaveToast();
  return (
    <SettingsForm onSave={handleSave}>
      <FormSection
        title="Site identity"
        description="The name, tagline and language settings that show up everywhere on the storefront."
      >
        <TextField label="Site name" defaultValue={SITE_NAME} />
        <TextArea label="Site tagline" defaultValue={SITE_TAGLINE} rows={2} />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Default language"
            defaultValue="en"
            options={[
              { value: "en", label: "English" },
              { value: "ur", label: "Urdu" },
              { value: "roman-ur", label: "Roman Urdu" },
            ]}
          />
          <SelectField
            label="Currency"
            defaultValue="PKR"
            options={[
              { value: "PKR", label: "Pakistani Rupee (Rs)" },
              { value: "USD", label: "US Dollar ($)" },
              { value: "AED", label: "UAE Dirham (AED)" },
            ]}
          />
        </div>
      </FormSection>

      <FormSection
        title="Branding"
        description="Logo, favicon and brand color. Asset upload is disabled in this demo."
      >
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface)] px-4 py-6 text-center text-xs text-[var(--color-ink-500)]">
          Drop a logo here · disabled in demo
        </div>
        <TextField label="Brand color (hex)" defaultValue="#18181b" />
      </FormSection>
    </SettingsForm>
  );
}

function ContactSettings() {
  const handleSave = useSaveToast();
  return (
    <SettingsForm onSave={handleSave}>
      <FormSection
        title="Store contact"
        description="Used in the support strip, footer and AI chat replies."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Support phone" defaultValue={SUPPORT_PHONE} />
          <TextField label="Landline" defaultValue={SUPPORT_LANDLINE} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Support email" type="email" defaultValue={SUPPORT_EMAIL} />
          <TextField
            label="WhatsApp number (no plus, no spaces)"
            defaultValue={WHATSAPP_NUMBER}
          />
        </div>
      </FormSection>

      <FormSection title="Hall Road outlet" description="Address shown on the about page.">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Address line 1" defaultValue={STORE_ADDRESS_LINE_1} />
          <TextField label="Address line 2" defaultValue={STORE_ADDRESS_LINE_2} />
        </div>
        <TextField label="Store hours" defaultValue={STORE_HOURS} />
      </FormSection>
    </SettingsForm>
  );
}

function PaymentSettings() {
  const handleSave = useSaveToast();
  return (
    <SettingsForm onSave={handleSave}>
      <FormSection
        title="Discounts"
        description="Order-wide discounts customers see at checkout."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Bank transfer discount %"
            type="number"
            defaultValue={BANK_TRANSFER_DISCOUNT_PERCENT}
            trailingAddon="%"
          />
          <TextField
            label="Default warranty (months)"
            type="number"
            defaultValue={DEFAULT_WARRANTY_MONTHS}
          />
        </div>
      </FormSection>

      <FormSection
        title="Payment methods"
        description="Methods accepted at checkout. Toggle off any you don't currently support."
      >
        <ul className="space-y-2">
          {PAYMENT_METHODS.map((method) => (
            <li
              key={method.id}
              className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink-900)]">{method.label}</p>
                <p className="text-xs text-[var(--color-ink-500)]">{method.note}</p>
              </div>
              <Switch label="" description="" defaultChecked />
            </li>
          ))}
        </ul>
      </FormSection>
    </SettingsForm>
  );
}

function DeliverySettings() {
  const handleSave = useSaveToast();
  return (
    <SettingsForm onSave={handleSave}>
      <FormSection
        title="Delivery rules"
        description="Free-delivery threshold and which cities are eligible."
      >
        <TextField
          label="Free delivery over (Rs)"
          type="number"
          defaultValue={FREE_DELIVERY_THRESHOLD_RUPEES}
          trailingAddon="Rs"
        />
        <CityChips defaultCities={[...SERVICE_CITIES]} />
      </FormSection>

      <FormSection
        title="Verification policies"
        description="Where customers can verify their unit before paying."
      >
        <Switch
          label="Allow cash-on-delivery in Lahore"
          description="COD with in-person inspection at delivery."
          defaultChecked
        />
        <Switch
          label="Require dispatch video for non-Lahore orders"
          description="Send IMEI + body video on WhatsApp before shipping."
          defaultChecked
        />
        <Switch
          label="Allow in-store walk-in inspection"
          description="Customers can come to Hall Road and verify before paying."
          defaultChecked
        />
      </FormSection>
    </SettingsForm>
  );
}

function SocialSettings() {
  const handleSave = useSaveToast();
  return (
    <SettingsForm onSave={handleSave}>
      <FormSection title="Social profiles" description="Linked from the footer and about page.">
        <TextField label="Facebook URL" defaultValue={SOCIAL_LINKS.facebook} />
        <TextField label="Instagram URL" defaultValue={SOCIAL_LINKS.instagram} />
        <TextField label="TikTok URL" defaultValue={SOCIAL_LINKS.tiktok} />
        <TextField label="YouTube URL" defaultValue={SOCIAL_LINKS.youtube} />
        <TextField label="Google Maps URL" defaultValue={SOCIAL_LINKS.googleMaps} />
      </FormSection>
    </SettingsForm>
  );
}

function PolicySettings() {
  const handleSave = useSaveToast();
  return (
    <SettingsForm onSave={handleSave}>
      <FormSection
        title="Customer policies"
        description="Policy values surfaced on product pages, FAQs and dispatch confirmations."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Moneyback window (days)"
            type="number"
            defaultValue={MONEYBACK_DAYS}
          />
          <TextField
            label="Default warranty (months)"
            type="number"
            defaultValue={DEFAULT_WARRANTY_MONTHS}
          />
        </div>
        <TextArea
          label="Returns & refunds policy"
          rows={4}
          defaultValue="Return any unit within 15 days for a full refund — no questions asked. Refunds are processed by bank transfer within 48 hours of receipt."
        />
        <TextArea
          label="After-sales service"
          rows={3}
          defaultValue="We service genuine factory faults even after the warranty period. Physical damage, water damage and unauthorised repairs are excluded."
        />
      </FormSection>

      <FormSection
        title="Pakistan-specific"
        description="PTA tax handling and IMEI tracking."
      >
        <Switch
          label="Highlight PTA-approved units on storefront"
          description="Adds a green PTA badge to qualifying variants."
          defaultChecked
        />
        <Switch
          label="Auto-include IMEI in dispatch video"
          description="Required for our verification flow."
          defaultChecked
        />
      </FormSection>
    </SettingsForm>
  );
}

interface SettingsFormProps {
  onSave: () => void;
  children: React.ReactNode;
}

function SettingsForm({ onSave, children }: SettingsFormProps) {
  return (
    <>
      <div className="space-y-1">{children}</div>
      <SaveBar onSave={onSave} />
    </>
  );
}

interface CityChipsProps {
  defaultCities: string[];
}

function CityChips({ defaultCities }: CityChipsProps) {
  const toast = useToast();
  const [cities, setCities] = useState(defaultCities);
  const [draftCity, setDraftCity] = useState("");

  function handleAdd() {
    const trimmed = draftCity.trim();
    if (!trimmed || cities.includes(trimmed)) return;
    setCities((current) => [...current, trimmed]);
    setDraftCity("");
    toast.success(`Added ${trimmed} to delivery cities`);
  }

  function handleRemove(city: string) {
    setCities((current) => current.filter((existing) => existing !== city));
    toast.warn(`Removed ${city}`);
  }

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]">
        Service cities
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {cities.map((city) => (
          <span
            key={city}
            className="inline-flex items-center gap-1 rounded-[var(--radius-full)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink-800)]"
          >
            {city}
            <button
              type="button"
              aria-label={`Remove ${city}`}
              onClick={() => handleRemove(city)}
              className="text-[var(--color-ink-400)] transition-colors hover:text-rose-500"
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={draftCity}
          onChange={(event) => setDraftCity(event.target.value)}
          placeholder="Add a city, e.g. Sialkot"
          className="h-9 flex-1 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-ink-400)] focus:outline-none"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          leadingIcon={<Plus size={12} />}
          onClick={handleAdd}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
