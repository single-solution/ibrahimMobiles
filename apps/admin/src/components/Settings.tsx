"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings as SettingsIcon } from "lucide-react";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";

import { STORE_SETTING_GROUPS, type StoreSettings } from "@store/shared";

import { FormSection } from "@/components/forms/FormSection";
import { Switch } from "@/components/forms/Switch";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { HomepageSettings } from "@/components/settings/HomepageSettings";
import { SettingsCleanup } from "@/components/SettingsCleanup";
import { ChatSettingsTab } from "@/components/ChatSettingsTab";
import { SeoSettingsTab } from "@/components/SeoSettingsTab";
import {
  getSettingsTabMeta,
  isSettingsTabId,
  SETTINGS_NAV_GROUPS,
  SettingsFormPanel,
  SettingsMobileTabChip,
  SettingsNavItem,
  SettingsPanelHeader,
  SettingsSaveFooter,
  type SettingsTabId,
} from "@/components/settings/settingsWorkspaceUi";
import { useToast } from "@/components/Toast";
import {
  WorkspaceFrame,
  WorkspaceListHeader,
  WorkspaceReadOnlyBanner,
} from "@/components/workspace/adminWorkspaceUi";
import { useAdminPermissions } from "@/lib/adminPermissionsContext";
import { classNames } from "@store/shared";

interface SettingsProps {
  initialSettings: StoreSettings;
}

export function Settings({ initialSettings }: SettingsProps) {
  return (
    <Suspense fallback={null}>
      <SettingsInner initialSettings={initialSettings} />
    </Suspense>
  );
}

function SettingsInner({ initialSettings }: SettingsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = useAdminPermissions();
  const canUpdate = can("settings_update");
  const canCleanup = can("data_cleanup");

  const [savedSettings, setSavedSettings] = useState<StoreSettings>(initialSettings);
  const [draft, setDraft] = useState<StoreSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<SettingsTabId>("store");

  const navGroups = useMemo(
    () =>
      SETTINGS_NAV_GROUPS.map((group) => ({
        ...group,
        tabs: group.tabs.filter(
          (tab) => tab.id !== "cleanup" || canCleanup,
        ),
      })).filter((group) => group.tabs.length > 0),
    [canCleanup],
  );

  const flatTabs = useMemo(
    () => navGroups.flatMap((group) => group.tabs),
    [navGroups],
  );

  const activeMeta = getSettingsTabMeta(activeTab);

  function setField<K extends keyof StoreSettings>(field: K, value: StoreSettings[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    scheduleStateUpdate(() => {
      const fromUrl = searchParams.get("tab");
      if (isSettingsTabId(fromUrl)) {
        if (fromUrl === "cleanup" && !canCleanup) {
          setActiveTab("store");
          return;
        }
        setActiveTab(fromUrl);
        return;
      }
      if (!flatTabs.some((tab) => tab.id === activeTab)) {
        setActiveTab(flatTabs[0]?.id ?? "store");
      }
    });
  }, [activeTab, canCleanup, flatTabs, searchParams]);

  function setTabUrl(tab: SettingsTabId) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  }

  const tabContent: Record<SettingsTabId, ReactNode> = {
    store: (
      <StoreDetailsSettings
        draft={draft}
        saved={savedSettings}
        setField={setField}
        onSaved={setSavedSettings}
        canUpdate={canUpdate}
      />
    ),
    contact: (
      <ContactSettings
        draft={draft}
        saved={savedSettings}
        setField={setField}
        onSaved={setSavedSettings}
        canUpdate={canUpdate}
      />
    ),
    payments: (
      <PaymentSettings
        draft={draft}
        saved={savedSettings}
        setField={setField}
        onSaved={setSavedSettings}
        canUpdate={canUpdate}
      />
    ),
    delivery: (
      <DeliverySettings
        draft={draft}
        saved={savedSettings}
        setField={setField}
        onSaved={setSavedSettings}
        canUpdate={canUpdate}
      />
    ),
    inventory: (
      <InventorySettings
        draft={draft}
        saved={savedSettings}
        setField={setField}
        onSaved={setSavedSettings}
        canUpdate={canUpdate}
      />
    ),
    marketing: (
      <MarketingSettings
        draft={draft}
        saved={savedSettings}
        setField={setField}
        onSaved={setSavedSettings}
        canUpdate={canUpdate}
      />
    ),
    social: (
      <SocialSettings
        draft={draft}
        saved={savedSettings}
        setField={setField}
        onSaved={setSavedSettings}
        canUpdate={canUpdate}
      />
    ),
    policies: (
      <PolicySettings
        draft={draft}
        saved={savedSettings}
        setField={setField}
        onSaved={setSavedSettings}
        canUpdate={canUpdate}
      />
    ),
    loyalty: (
      <LoyaltySettings
        draft={draft}
        saved={savedSettings}
        setField={setField}
        onSaved={setSavedSettings}
        canUpdate={canUpdate}
      />
    ),
    homepage: (
      <HomepageSettings
        draft={draft}
        saved={savedSettings}
        setField={setField}
        onSaved={setSavedSettings}
        canUpdate={canUpdate}
        renderSaveable={({ fields, children }) => (
          <SaveableSection
            fields={fields}
            draft={draft}
            saved={savedSettings}
            setField={setField}
            onSaved={setSavedSettings}
            canUpdate={canUpdate}
          >
            {children}
          </SaveableSection>
        )}
      />
    ),
    seo: <SeoSettingsTab readOnly={!canUpdate} />,
    chat: <ChatSettingsTab readOnly={!canUpdate} />,
    cleanup: <SettingsCleanup />,
  };

  return (
    <WorkspaceFrame minHeight={false}>
      <WorkspaceListHeader
        icon={SettingsIcon}
        title="Settings"
        subtitle="Storefront, commerce rules, SEO, chat widget, and optional data cleanup."
      />
      {!canUpdate ? (
        <WorkspaceReadOnlyBanner message="Read-only — you can view settings but not save changes." />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="hidden shrink-0 flex-col border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-2.5 lg:flex lg:w-44 lg:border-b-0 lg:border-r xl:w-52">
          <nav aria-label="Settings sections" className="-mx-1 flex-1 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.id} className="mb-3 last:mb-0">
                <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                  {group.label}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {group.tabs.map((tab) => (
                    <SettingsNavItem
                      key={tab.id}
                      label={tab.label}
                      isActive={activeTab === tab.id}
                      onClick={() => setTabUrl(tab.id)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-3 py-2 lg:hidden">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {flatTabs.map((tab) => (
                <SettingsMobileTabChip
                  key={tab.id}
                  label={tab.label}
                  isActive={activeTab === tab.id}
                  onClick={() => setTabUrl(tab.id)}
                />
              ))}
            </div>
          </div>

          <div
            className={classNames(
              "min-h-0 flex-1 overflow-y-auto",
              activeTab === "chat" && "bg-[var(--color-canvas-deep)]",
            )}
          >
            <SettingsPanelHeader
              title={activeMeta.label}
              description={activeMeta.description}
            />
            {tabContent[activeTab]}
          </div>
        </section>
      </div>
    </WorkspaceFrame>
  );
}

interface SectionProps {
  draft: StoreSettings;
  saved: StoreSettings;
  setField<K extends keyof StoreSettings>(field: K, value: StoreSettings[K]): void;
  onSaved(settings: StoreSettings): void;
  canUpdate: boolean;
}

function StoreDetailsSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.branding}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
    >
      <FormSection
        title="Site identity"
        description="The name and tagline that show up across the storefront, page titles, and the AI assistant greeting."
      >
        <TextField
          label="Site name"
          value={draft.siteName}
          onChange={(event) => setField("siteName", event.target.value)}
          placeholder="e.g. Ibrahim Mobiles"
          hint="Appears in the navbar, page titles, emails, and assistant greetings."
          disabled={!canUpdate}
        />
        <TextArea
          label="Site tagline"
          rows={2}
          value={draft.siteTagline}
          onChange={(event) => setField("siteTagline", event.target.value)}
          placeholder="Short one-liner that sits under the site name (e.g. Pakistan's trusted mobile store)."
          disabled={!canUpdate}
        />
        <TextField
          label="Storefront URL"
          type="url"
          value={draft.storefrontUrl}
          onChange={(event) => setField("storefrontUrl", event.target.value)}
          placeholder="https://ibrahimmobiles.com"
          inputMode="url"
          autoComplete="url"
          hint="Used by the admin's 'View storefront' links and as the SEO canonical base. Leave blank to fall back to the deploy environment URL."
          disabled={!canUpdate}
        />
      </FormSection>
    </SaveableSection>
  );
}

function ContactSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const fields = useMemo(
    () => [...STORE_SETTING_GROUPS.contact, ...STORE_SETTING_GROUPS.address],
    [],
  );
  return (
    <SaveableSection
      fields={fields}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
    >
      <FormSection
        title="Store contact"
        description="Used in the support strip, footer, automated inquiry replies, and order confirmation emails."
      >
        <TextField
          label="Support phone"
          value={draft.supportPhone}
          onChange={(event) => setField("supportPhone", event.target.value)}
          placeholder="+92 320 4862403"
          inputMode="tel"
          autoComplete="tel"
          disabled={!canUpdate}
        />
        <TextField
          label="Landline"
          value={draft.supportLandline}
          onChange={(event) => setField("supportLandline", event.target.value)}
          placeholder="042 35711234"
          inputMode="tel"
          disabled={!canUpdate}
        />
        <TextField
          label="Support email"
          type="email"
          value={draft.supportEmail}
          onChange={(event) => setField("supportEmail", event.target.value)}
          placeholder="support@yourstore.com"
          inputMode="email"
          autoComplete="email"
          disabled={!canUpdate}
        />
        <TextField
          label="WhatsApp number"
          value={draft.whatsappNumber}
          onChange={(event) => setField("whatsappNumber", event.target.value)}
          placeholder="923204862403"
          inputMode="tel"
          hint="Digits only — country code first, no plus or spaces (e.g. 923204862403)."
          disabled={!canUpdate}
        />
      </FormSection>

      <FormSection title="Outlet address" description="Address shown on the about page and in the footer.">
        <TextField
          label="Address line 1"
          value={draft.storeAddressLine1}
          onChange={(event) => setField("storeAddressLine1", event.target.value)}
          placeholder="Shop 12, Main Boulevard"
          autoComplete="address-line1"
          disabled={!canUpdate}
        />
        <TextField
          label="Address line 2"
          value={draft.storeAddressLine2}
          onChange={(event) => setField("storeAddressLine2", event.target.value)}
          placeholder="Gulberg III, Lahore"
          autoComplete="address-line2"
          disabled={!canUpdate}
        />
        <TextField
          label="Store hours"
          value={draft.storeHours}
          onChange={(event) => setField("storeHours", event.target.value)}
          placeholder="Mon–Sat · 11am – 10pm"
          hint="Shown in the footer and About page."
          disabled={!canUpdate}
        />
      </FormSection>
    </SaveableSection>
  );
}

function PaymentSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.payments}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
    >
      <FormSection
        title="Methods enabled at checkout"
        description="Toggle off any method you can't honour right now — the chip disappears from checkout immediately. Customers always see at least one method."
      >
        <Switch
          label="Bank transfer"
          description="Customers pay in advance to your bank account."
          checked={draft.paymentBankEnabled}
          onCheckedChange={(value) => setField("paymentBankEnabled", value)}
          disabled={!canUpdate}
        />
        <Switch
          label="Easypaisa"
          description="Mobile wallet pre-payment."
          checked={draft.paymentEasypaisaEnabled}
          onCheckedChange={(value) => setField("paymentEasypaisaEnabled", value)}
          disabled={!canUpdate}
        />
        <Switch
          label="JazzCash"
          description="Mobile wallet pre-payment."
          checked={draft.paymentJazzcashEnabled}
          onCheckedChange={(value) => setField("paymentJazzcashEnabled", value)}
          disabled={!canUpdate}
        />
        <Switch
          label="Cash on delivery / pickup"
          description="Pay on hand-over for in-Lahore delivery or shop pickup."
          checked={draft.paymentCodEnabled}
          onCheckedChange={(value) => setField("paymentCodEnabled", value)}
          disabled={!canUpdate}
        />
      </FormSection>

      <FormSection
        title="Bank transfer details"
        description="Shown to customers on the order success page after they pick bank transfer. Each row gets a Copy button."
      >
        <TextField
          label="Bank name"
          value={draft.paymentBankName}
          onChange={(event) => setField("paymentBankName", event.target.value)}
          placeholder="e.g. Meezan Bank"
          disabled={!canUpdate}
        />
        <TextField
          label="Account title"
          value={draft.paymentBankAccountTitle}
          onChange={(event) => setField("paymentBankAccountTitle", event.target.value)}
          placeholder="As registered on the bank account"
          disabled={!canUpdate}
        />
        <TextField
          label="Account number"
          value={draft.paymentBankAccountNumber}
          onChange={(event) => setField("paymentBankAccountNumber", event.target.value)}
          placeholder="e.g. 0123456789012"
          inputMode="numeric"
          disabled={!canUpdate}
        />
        <TextField
          label="IBAN"
          value={draft.paymentBankIban}
          onChange={(event) => setField("paymentBankIban", event.target.value)}
          placeholder="e.g. PK24MEZN0001230012345678"
          hint="Leave blank if you don't have an IBAN — the row hides automatically."
          disabled={!canUpdate}
        />
      </FormSection>

      <FormSection
        title="Easypaisa details"
        description="Wallet account customers send their advance to."
      >
        <TextField
          label="Account title"
          value={draft.paymentEasypaisaAccountTitle}
          onChange={(event) => setField("paymentEasypaisaAccountTitle", event.target.value)}
          placeholder="As registered on the wallet"
          disabled={!canUpdate}
        />
        <TextField
          label="Wallet number"
          value={draft.paymentEasypaisaNumber}
          onChange={(event) => setField("paymentEasypaisaNumber", event.target.value)}
          placeholder="e.g. 0300-1234567"
          inputMode="tel"
          disabled={!canUpdate}
        />
      </FormSection>

      <FormSection
        title="JazzCash details"
        description="Wallet account customers send their advance to."
      >
        <TextField
          label="Account title"
          value={draft.paymentJazzcashAccountTitle}
          onChange={(event) => setField("paymentJazzcashAccountTitle", event.target.value)}
          placeholder="As registered on the wallet"
          disabled={!canUpdate}
        />
        <TextField
          label="Wallet number"
          value={draft.paymentJazzcashNumber}
          onChange={(event) => setField("paymentJazzcashNumber", event.target.value)}
          placeholder="e.g. 0301-1234567"
          inputMode="tel"
          disabled={!canUpdate}
        />
      </FormSection>

      <FormSection
        title="Cash on delivery copy"
        description="Short note shown under the COD chip and on the order page."
      >
        <TextField
          label="COD note"
          value={draft.paymentCodNote}
          onChange={(event) => setField("paymentCodNote", event.target.value)}
          placeholder="Lahore only · in-person verify"
          disabled={!canUpdate}
        />
      </FormSection>

      <FormSection title="Discounts" description="Order-wide discounts customers see at checkout.">
        <NumberField
          label="Bank transfer discount %"
          value={draft.bankTransferDiscountPercent}
          onChange={(value) => setField("bankTransferDiscountPercent", value)}
          trailingAddon="%"
          placeholder="e.g. 2"
          hint="Applied automatically when the customer chooses bank transfer at checkout."
          disabled={!canUpdate}
        />
      </FormSection>
    </SaveableSection>
  );
}

function InventorySettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.inventory}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
    >
      <FormSection
        title="Stock alerts"
        description="Variants with stock at or below this number show up in the dashboard 'Low stock' KPI and the bell-menu warning."
      >
        <NumberField
          label="Low-stock threshold"
          value={draft.lowStockThreshold}
          onChange={(value) => setField("lowStockThreshold", value)}
          trailingAddon="units"
          placeholder="e.g. 2"
          hint="Set to 0 to silence low-stock alerts entirely."
          disabled={!canUpdate}
        />
      </FormSection>
    </SaveableSection>
  );
}

function MarketingSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.marketing}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
    >
      <FormSection
        title="Tracking pixels"
        description="Paste each ID from its respective console. Empty fields stay disabled — no script tags are injected."
      >
        <TextField
          label="Meta (Facebook) Pixel ID"
          value={draft.metaPixelId}
          onChange={(event) => setField("metaPixelId", event.target.value)}
          placeholder="e.g. 123456789012345"
          inputMode="numeric"
          hint="6–20 digits. Find it in Events Manager → Data sources."
          disabled={!canUpdate}
        />
        <TextField
          label="Google Analytics 4 measurement ID"
          value={draft.googleAnalyticsId}
          onChange={(event) => setField("googleAnalyticsId", event.target.value.toUpperCase())}
          placeholder="G-XXXXXXXXXX"
          hint="Looks like G- followed by 4–20 letters/digits."
          disabled={!canUpdate}
        />
        <TextField
          label="Google Tag Manager container ID"
          value={draft.googleTagManagerId}
          onChange={(event) => setField("googleTagManagerId", event.target.value.toUpperCase())}
          placeholder="GTM-XXXXXXX"
          hint="Use this if you'd rather drive tags through GTM."
          disabled={!canUpdate}
        />
        <TextField
          label="TikTok Pixel ID"
          value={draft.tiktokPixelId}
          onChange={(event) => setField("tiktokPixelId", event.target.value.toUpperCase())}
          placeholder="e.g. CXXXXXXXXXXXXXXXX"
          hint="16–40 alphanumeric characters. Found in TikTok Events Manager."
          disabled={!canUpdate}
        />
      </FormSection>
    </SaveableSection>
  );
}

function DeliverySettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  return (
    <SaveableSection
      fields={["freeDeliveryThresholdRupees"] as const}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
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
          placeholder="e.g. 5000"
          hint="Cart totals at or above this amount ship for free."
          disabled={!canUpdate}
        />
      </FormSection>
    </SaveableSection>
  );
}

function SocialSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.social}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
    >
      <FormSection title="Social profiles" description="Linked from the footer and about page.">
        <TextField
          label="Facebook URL"
          type="url"
          value={draft.socialFacebook}
          onChange={(event) => setField("socialFacebook", event.target.value)}
          placeholder="https://facebook.com/yourstore"
          inputMode="url"
          disabled={!canUpdate}
        />
        <TextField
          label="Instagram URL"
          type="url"
          value={draft.socialInstagram}
          onChange={(event) => setField("socialInstagram", event.target.value)}
          placeholder="https://instagram.com/yourstore"
          inputMode="url"
          disabled={!canUpdate}
        />
        <TextField
          label="TikTok URL"
          type="url"
          value={draft.socialTiktok}
          onChange={(event) => setField("socialTiktok", event.target.value)}
          placeholder="https://tiktok.com/@yourstore"
          inputMode="url"
          disabled={!canUpdate}
        />
        <TextField
          label="YouTube URL"
          type="url"
          value={draft.socialYoutube}
          onChange={(event) => setField("socialYoutube", event.target.value)}
          placeholder="https://youtube.com/@yourstore"
          inputMode="url"
          disabled={!canUpdate}
        />
        <TextField
          label="Google Maps URL"
          type="url"
          value={draft.socialGoogleMaps}
          onChange={(event) => setField("socialGoogleMaps", event.target.value)}
          placeholder="https://goo.gl/maps/…"
          hint="Used by the 'Get directions' link on the About page."
          inputMode="url"
          disabled={!canUpdate}
        />
      </FormSection>
    </SaveableSection>
  );
}

function LoyaltySettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.loyalty}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
    >
      <FormSection
        title="Loyalty programme"
        description="Earn rate and bonus values shown on the account dashboard and checkout."
      >
        <NumberField
          label="Earn rate (% of order total)"
          value={draft.loyaltyEarnPercent}
          onChange={(value) => setField("loyaltyEarnPercent", value)}
          trailingAddon="%"
          placeholder="e.g. 1"
          hint="Points earned per Rupee spent on a paid order."
          disabled={!canUpdate}
        />
        <NumberField
          label="Review bonus (pts)"
          value={draft.loyaltyReviewBonusPoints}
          onChange={(value) => setField("loyaltyReviewBonusPoints", value)}
          placeholder="e.g. 50"
          hint="Awarded once when a customer submits a verified review."
          disabled={!canUpdate}
        />
        <NumberField
          label="Referral bonus per side (pts)"
          value={draft.loyaltyReferralBonusPoints}
          onChange={(value) => setField("loyaltyReferralBonusPoints", value)}
          placeholder="e.g. 100"
          hint="Both the referrer and the new customer get this many points."
          disabled={!canUpdate}
        />
      </FormSection>
    </SaveableSection>
  );
}

function PolicySettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  return (
    <SaveableSection
      fields={["moneybackDays", "defaultWarrantyMonths"] as const}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
    >
      <FormSection
        title="Customer policies"
        description="Policy values surfaced on product pages, FAQs and dispatch confirmations."
      >
        <NumberField
          label="Moneyback window (days)"
          value={draft.moneybackDays}
          onChange={(value) => setField("moneybackDays", value)}
          placeholder="e.g. 7"
          hint="Number of days a customer can request a refund after delivery."
          disabled={!canUpdate}
        />
        <NumberField
          label="Default warranty (months)"
          value={draft.defaultWarrantyMonths}
          onChange={(value) => setField("defaultWarrantyMonths", value)}
          placeholder="e.g. 12"
          hint="Used when a product doesn't override its warranty."
          disabled={!canUpdate}
        />
      </FormSection>
    </SaveableSection>
  );
}

interface SaveableSectionProps {
  fields: ReadonlyArray<keyof StoreSettings>;
  draft: StoreSettings;
  saved: StoreSettings;
  setField<K extends keyof StoreSettings>(field: K, value: StoreSettings[K]): void;
  onSaved(settings: StoreSettings): void;
  canUpdate: boolean;
  children: ReactNode;
}

function SaveableSection({
  fields,
  draft,
  saved,
  setField,
  onSaved,
  canUpdate,
  children,
}: SaveableSectionProps) {
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
            hint={
              isDirty
                ? "You have unsaved changes on this tab."
                : "Up to date — changes appear on the storefront within about a minute."
            }
          />
        ) : undefined
      }
    >
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
}

function NumberField({
  label,
  value,
  onChange,
  trailingAddon,
  disabled,
  placeholder,
  hint,
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
    />
  );
}
