"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Banknote,
  ExternalLink,
  Eye,
  Gauge,
  Gift,
  Globe2,
  ImagePlus,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Settings as SettingsIcon,
  Share2,
  ShieldCheck,
  Smile,
  Sparkles,
  Truck,
  Video,
  Wallet,
} from "lucide-react";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";

import { STORE_SETTING_GROUPS, type StoreSettings } from "@store/shared";

import { FormSection } from "@/components/forms/FormSection";
import { Switch } from "@/components/forms/Switch";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { BrandImageUpload } from "@/components/uploads/BrandImageUpload";
import { HomepageSettings } from "@/components/settings/HomepageSettings";
import { SettingsCleanup } from "@/components/SettingsCleanup";
import { ChatSettingsTab } from "@/components/ChatSettingsTab";
import { SeoSettingsTab } from "@/components/SeoSettingsTab";
import {
  FormGrid,
  getSettingsTabMeta,
  isSettingsTabId,
  SETTINGS_NAV_GROUPS,
  SettingsFormPanel,
  SettingsMobileTabChip,
  SettingsNavItem,
  SettingsPanelHeader,
  SettingsSaveFooter,
  SettingsTabHero,
  type SettingsHeroMetric,
  type SettingsHeroMetricTone,
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
  const hasName = draft.siteName.trim().length > 0;
  const hasTagline = draft.siteTagline.trim().length > 0;
  const hasUrl = draft.storefrontUrl.trim().length > 0;
  const brandAssetCount = [
    draft.brandLogoLight,
    draft.brandLogoDark,
    draft.brandFaviconLight,
    draft.brandFaviconDark,
  ].filter((value) => value.trim().length > 0).length;
  const heroMetrics: SettingsHeroMetric[] = [
    {
      label: "Site name",
      value: hasName ? draft.siteName : "Not set",
      tone: hasName ? "good" : "warn",
      icon: Sparkles,
    },
    {
      label: "Tagline",
      value: hasTagline ? draft.siteTagline : "Not set",
      tone: hasTagline ? "good" : "warn",
      icon: Smile,
    },
    {
      label: "Storefront URL",
      value: hasUrl ? draft.storefrontUrl : "Auto (env)",
      tone: hasUrl ? "good" : "neutral",
      icon: Globe2,
    },
    {
      label: "Brand assets",
      value: brandAssetCount > 0 ? `${brandAssetCount} of 4 uploaded` : "Wordmark only",
      hint:
        brandAssetCount === 0
          ? "Header & footer show the site name only"
          : brandAssetCount === 4
            ? "Logo + favicon in both light and dark"
            : "Some surfaces still fall back to the wordmark",
      tone: brandAssetCount === 4 ? "good" : brandAssetCount > 0 ? "neutral" : "off",
      icon: ImagePlus,
    },
  ];
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.branding}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={
        <SettingsTabHero
          metrics={heroMetrics}
          actions={
            hasUrl ? (
              <a
                href={draft.storefrontUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-800)] hover:border-[var(--color-accent-300)] hover:text-[var(--color-accent-800)]"
              >
                <Eye size={13} /> Open storefront
                <ExternalLink size={11} className="opacity-60" />
              </a>
            ) : null
          }
        />
      }
    >
      <FormSection
        title="Site identity"
        description="The name and tagline that show up across the storefront, page titles, and the AI assistant greeting."
      >
        <FormGrid>
          <TextField
            label="Site name"
            value={draft.siteName}
            onChange={(event) => setField("siteName", event.target.value)}
            placeholder="e.g. Ibrahim Mobiles"
            hint="Appears in the navbar, page titles, emails, and assistant greetings."
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Storefront URL"
            type="url"
            value={draft.storefrontUrl}
            onChange={(event) => setField("storefrontUrl", event.target.value)}
            placeholder="https://ibrahimmobiles.com"
            inputMode="url"
            autoComplete="url"
            hint="Leave blank to fall back to the deploy environment URL."
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
        </FormGrid>
        <TextArea
          label="Site tagline"
          rows={2}
          value={draft.siteTagline}
          onChange={(event) => setField("siteTagline", event.target.value)}
          placeholder="Short one-liner that sits under the site name (e.g. Pakistan's trusted mobile store)."
          disabled={!canUpdate}
          containerClassName="max-w-2xl"
        />
      </FormSection>

      <FormSection
        title="Brand assets"
        description="Logo and favicon for light and dark surfaces. Leave any tile empty and the storefront falls back to the wordmark — no icon. Square-ish PNG/WebP transparent files render best."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <BrandImageUpload
            label="Logo · light surface"
            hint="Top header, login, light pages. Transparent background recommended."
            value={draft.brandLogoLight}
            onChange={(value) => setField("brandLogoLight", value)}
            previewTone="light"
            subjectKind="brand-logo-light"
            disabled={!canUpdate}
          />
          <BrandImageUpload
            label="Logo · dark surface"
            hint="Footer & any dark hero block. Falls back to the light logo if blank."
            value={draft.brandLogoDark}
            onChange={(value) => setField("brandLogoDark", value)}
            previewTone="dark"
            subjectKind="brand-logo-dark"
            disabled={!canUpdate}
          />
          <BrandImageUpload
            label="Favicon · light theme"
            hint="Browser tab icon for users on light system themes."
            value={draft.brandFaviconLight}
            onChange={(value) => setField("brandFaviconLight", value)}
            previewTone="light"
            subjectKind="brand-favicon-light"
            disabled={!canUpdate}
          />
          <BrandImageUpload
            label="Favicon · dark theme"
            hint="Browser tab icon for users on dark system themes."
            value={draft.brandFaviconDark}
            onChange={(value) => setField("brandFaviconDark", value)}
            previewTone="dark"
            subjectKind="brand-favicon-dark"
            disabled={!canUpdate}
          />
        </div>
      </FormSection>
    </SaveableSection>
  );
}

function ContactSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const fields = useMemo(
    () => [...STORE_SETTING_GROUPS.contact, ...STORE_SETTING_GROUPS.address],
    [],
  );
  const phoneClean = draft.supportPhone.replace(/[^\d+]/g, "");
  const wa = draft.whatsappNumber.replace(/\D/g, "");
  const heroMetrics: SettingsHeroMetric[] = [
    {
      label: "Support phone",
      value: draft.supportPhone || "Not set",
      tone: draft.supportPhone ? "good" : "warn",
      icon: Phone,
    },
    {
      label: "WhatsApp",
      value: draft.whatsappNumber || "Not set",
      tone: wa ? "good" : "warn",
      icon: MessageCircle,
    },
    {
      label: "Email",
      value: draft.supportEmail || "Not set",
      tone: draft.supportEmail ? "good" : "warn",
      icon: Mail,
    },
    {
      label: "Outlet",
      value: draft.storeAddressLine1 || "Not set",
      hint: draft.storeAddressLine2 || undefined,
      tone: draft.storeAddressLine1 ? "good" : "neutral",
      icon: MapPin,
    },
  ];
  return (
    <SaveableSection
      fields={fields}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={
        <SettingsTabHero
          metrics={heroMetrics}
          actions={
            <>
              {phoneClean ? (
                <a
                  href={`tel:${phoneClean}`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-800)] hover:border-[var(--color-accent-300)] hover:text-[var(--color-accent-800)]"
                >
                  <Phone size={13} /> Test call
                </a>
              ) : null}
              {wa ? (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-800)] hover:border-[var(--color-accent-300)] hover:text-[var(--color-accent-800)]"
                >
                  <MessageCircle size={13} /> Test WhatsApp
                  <ExternalLink size={11} className="opacity-60" />
                </a>
              ) : null}
              {draft.supportEmail ? (
                <a
                  href={`mailto:${draft.supportEmail}`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-800)] hover:border-[var(--color-accent-300)] hover:text-[var(--color-accent-800)]"
                >
                  <Mail size={13} /> Send test email
                </a>
              ) : null}
            </>
          }
        />
      }
    >
      <FormSection
        title="Store contact"
        description="Used in the support strip, footer, automated inquiry replies, and order confirmation emails."
      >
        <FormGrid>
          <TextField
            label="Support phone"
            value={draft.supportPhone}
            onChange={(event) => setField("supportPhone", event.target.value)}
            placeholder="+92 320 4862403"
            inputMode="tel"
            autoComplete="tel"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Landline"
            value={draft.supportLandline}
            onChange={(event) => setField("supportLandline", event.target.value)}
            placeholder="042 35711234"
            inputMode="tel"
            disabled={!canUpdate}
            containerClassName="max-w-md"
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
            containerClassName="max-w-md"
          />
          <TextField
            label="WhatsApp number"
            value={draft.whatsappNumber}
            onChange={(event) => setField("whatsappNumber", event.target.value)}
            placeholder="923204862403"
            inputMode="tel"
            hint="Digits only — country code first, no plus or spaces."
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Outlet address" description="Address shown on the about page and in the footer.">
        <FormGrid>
          <TextField
            label="Address line 1"
            value={draft.storeAddressLine1}
            onChange={(event) => setField("storeAddressLine1", event.target.value)}
            placeholder="Shop 12, Main Boulevard"
            autoComplete="address-line1"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Address line 2"
            value={draft.storeAddressLine2}
            onChange={(event) => setField("storeAddressLine2", event.target.value)}
            placeholder="Gulberg III, Lahore"
            autoComplete="address-line2"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Store hours"
            value={draft.storeHours}
            onChange={(event) => setField("storeHours", event.target.value)}
            placeholder="Mon–Sat · 11am – 10pm"
            hint="Shown in the footer and About page."
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
        </FormGrid>
      </FormSection>
    </SaveableSection>
  );
}

function PaymentSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const enabledCount = [
    draft.paymentBankEnabled,
    draft.paymentEasypaisaEnabled,
    draft.paymentJazzcashEnabled,
    draft.paymentCodEnabled,
  ].filter(Boolean).length;
  const bankReady = Boolean(
    draft.paymentBankEnabled &&
      draft.paymentBankName.trim() &&
      (draft.paymentBankAccountNumber.trim() || draft.paymentBankIban.trim()),
  );
  const easypaisaReady = Boolean(
    draft.paymentEasypaisaEnabled && draft.paymentEasypaisaNumber.trim(),
  );
  const jazzcashReady = Boolean(
    draft.paymentJazzcashEnabled && draft.paymentJazzcashNumber.trim(),
  );
  const heroMetrics: SettingsHeroMetric[] = [
    {
      label: "Methods at checkout",
      value: `${enabledCount} of 4`,
      hint: enabledCount === 0 ? "Checkout has no methods!" : "Live on storefront",
      tone: enabledCount === 0 ? "warn" : enabledCount >= 2 ? "good" : "neutral",
      icon: Wallet,
    },
    {
      label: "Bank transfer",
      value: !draft.paymentBankEnabled
        ? "Off"
        : bankReady
          ? "Ready"
          : "Missing details",
      tone: !draft.paymentBankEnabled ? "off" : bankReady ? "good" : "warn",
      icon: Banknote,
    },
    {
      label: "Easypaisa",
      value: !draft.paymentEasypaisaEnabled
        ? "Off"
        : easypaisaReady
          ? "Ready"
          : "Missing wallet",
      tone: !draft.paymentEasypaisaEnabled ? "off" : easypaisaReady ? "good" : "warn",
      icon: Wallet,
    },
    {
      label: "JazzCash",
      value: !draft.paymentJazzcashEnabled
        ? "Off"
        : jazzcashReady
          ? "Ready"
          : "Missing wallet",
      tone: !draft.paymentJazzcashEnabled ? "off" : jazzcashReady ? "good" : "warn",
      icon: Wallet,
    },
    {
      label: "Bank discount",
      value: `${draft.bankTransferDiscountPercent || 0}%`,
      hint: draft.bankTransferDiscountPercent > 0 ? "Auto-applied at checkout" : "No discount",
      tone: draft.bankTransferDiscountPercent > 0 ? "good" : "neutral",
      icon: Sparkles,
    },
  ];
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.payments}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={<SettingsTabHero metrics={heroMetrics} />}
    >
      <FormSection
        title="Methods enabled at checkout"
        description="Toggle off any method you can't honour right now — the chip disappears from checkout immediately. Customers always see at least one method."
      >
        <FormGrid>
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
        </FormGrid>
      </FormSection>

      <FormSection
        title="Bank transfer details"
        description="Shown to customers on the order success page after they pick bank transfer. Each row gets a Copy button."
      >
        <FormGrid>
          <TextField
            label="Bank name"
            value={draft.paymentBankName}
            onChange={(event) => setField("paymentBankName", event.target.value)}
            placeholder="e.g. Meezan Bank"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Account title"
            value={draft.paymentBankAccountTitle}
            onChange={(event) => setField("paymentBankAccountTitle", event.target.value)}
            placeholder="As registered on the bank account"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Account number"
            value={draft.paymentBankAccountNumber}
            onChange={(event) => setField("paymentBankAccountNumber", event.target.value)}
            placeholder="e.g. 0123456789012"
            inputMode="numeric"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="IBAN"
            value={draft.paymentBankIban}
            onChange={(event) => setField("paymentBankIban", event.target.value)}
            placeholder="e.g. PK24MEZN0001230012345678"
            hint="Leave blank if you don't have an IBAN — the row hides automatically."
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Mobile wallet details"
        description="Account particulars customers see on the order success page after picking a wallet."
      >
        <div className="grid gap-3 md:gap-5 md:grid-cols-2">
          <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-3 md:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
              Easypaisa
            </p>
            <TextField
              label="Account title"
              value={draft.paymentEasypaisaAccountTitle}
              onChange={(event) =>
                setField("paymentEasypaisaAccountTitle", event.target.value)
              }
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
          </div>
          <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-3 md:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
              JazzCash
            </p>
            <TextField
              label="Account title"
              value={draft.paymentJazzcashAccountTitle}
              onChange={(event) =>
                setField("paymentJazzcashAccountTitle", event.target.value)
              }
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
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Checkout copy & discounts"
        description="Short notes the customer sees alongside each method."
      >
        <FormGrid>
          <TextField
            label="COD note"
            value={draft.paymentCodNote}
            onChange={(event) => setField("paymentCodNote", event.target.value)}
            placeholder="Lahore only · in-person verify"
            hint="Shown under the Cash on Delivery chip and on the order page."
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <NumberField
            label="Bank transfer discount %"
            value={draft.bankTransferDiscountPercent}
            onChange={(value) => setField("bankTransferDiscountPercent", value)}
            trailingAddon="%"
            placeholder="e.g. 2"
            hint="Auto-applied when the customer picks bank transfer at checkout."
            disabled={!canUpdate}
          />
        </FormGrid>
      </FormSection>
    </SaveableSection>
  );
}

function InventorySettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const threshold = Math.max(0, Math.floor(draft.lowStockThreshold));
  const heroMetrics: SettingsHeroMetric[] = [
    {
      label: "Low-stock alert at",
      value: threshold === 0 ? "Disabled" : `≤ ${threshold} units`,
      hint:
        threshold === 0
          ? "Bell-menu and KPI alerts are silenced"
          : "Variants at or below this trigger alerts",
      tone: threshold === 0 ? "off" : "good",
      icon: Package,
    },
    {
      label: "Where it shows",
      value: "Dashboard + bell",
      hint: "Low-stock KPI · notification dropdown",
      tone: "neutral",
      icon: AlertCircle,
    },
  ];
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.inventory}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={<SettingsTabHero metrics={heroMetrics} />}
    >
      <FormSection
        title="Stock alerts"
        description="Variants with active stock at or below this number show up in the dashboard 'Low stock' KPI and the bell-menu warning."
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

const META_PIXEL_PATTERN = /^\d{6,20}$/;
const GA4_PATTERN = /^G-[A-Z0-9]{4,20}$/;
const GTM_PATTERN = /^GTM-[A-Z0-9]{4,12}$/;
const TIKTOK_PATTERN = /^[A-Z0-9]{16,40}$/;

function pixelStatus(value: string, pattern: RegExp): {
  tone: SettingsHeroMetricTone;
  label: string;
  validation?: string;
} {
  const trimmed = value.trim();
  if (!trimmed) return { tone: "off", label: "Off" };
  if (!pattern.test(trimmed)) {
    return { tone: "warn", label: "Invalid", validation: "Format doesn't match — pixel won't load." };
  }
  return { tone: "good", label: "Active" };
}

function MarketingSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const meta = pixelStatus(draft.metaPixelId, META_PIXEL_PATTERN);
  const ga = pixelStatus(draft.googleAnalyticsId, GA4_PATTERN);
  const gtm = pixelStatus(draft.googleTagManagerId, GTM_PATTERN);
  const tiktok = pixelStatus(draft.tiktokPixelId, TIKTOK_PATTERN);
  const heroMetrics: SettingsHeroMetric[] = [
    { label: "Meta Pixel", value: meta.label, tone: meta.tone, icon: Share2 },
    { label: "Google Analytics 4", value: ga.label, tone: ga.tone, icon: Gauge },
    { label: "Tag Manager", value: gtm.label, tone: gtm.tone, icon: Gauge },
    { label: "TikTok Pixel", value: tiktok.label, tone: tiktok.tone, icon: Sparkles },
  ];
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.marketing}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={
        <SettingsTabHero
          description="Pixel IDs are validated as you type. Empty fields stay disabled — no scripts are injected."
          metrics={heroMetrics}
        />
      }
    >
      <FormSection
        title="Tracking pixels"
        description="Paste each ID from its respective console. The storefront only loads pixels with valid IDs."
      >
        <FormGrid>
          <TextField
            label="Meta (Facebook) Pixel ID"
            value={draft.metaPixelId}
            onChange={(event) => setField("metaPixelId", event.target.value)}
            placeholder="e.g. 123456789012345"
            inputMode="numeric"
            hint="6–20 digits. Find it in Events Manager → Data sources."
            errorText={meta.validation}
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Google Analytics 4 measurement ID"
            value={draft.googleAnalyticsId}
            onChange={(event) => setField("googleAnalyticsId", event.target.value.toUpperCase())}
            placeholder="G-XXXXXXXXXX"
            hint="Looks like G- followed by 4–20 letters/digits."
            errorText={ga.validation}
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Google Tag Manager container ID"
            value={draft.googleTagManagerId}
            onChange={(event) => setField("googleTagManagerId", event.target.value.toUpperCase())}
            placeholder="GTM-XXXXXXX"
            hint="Use this if you'd rather drive tags through GTM."
            errorText={gtm.validation}
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="TikTok Pixel ID"
            value={draft.tiktokPixelId}
            onChange={(event) => setField("tiktokPixelId", event.target.value.toUpperCase())}
            placeholder="e.g. CXXXXXXXXXXXXXXXX"
            hint="16–40 alphanumeric characters. Found in TikTok Events Manager."
            errorText={tiktok.validation}
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
        </FormGrid>
      </FormSection>
    </SaveableSection>
  );
}

function DeliverySettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const threshold = Math.max(0, Math.floor(draft.freeDeliveryThresholdRupees));
  const heroMetrics: SettingsHeroMetric[] = [
    {
      label: "Free delivery from",
      value: threshold > 0 ? `Rs ${threshold.toLocaleString("en-PK")}+` : "Disabled",
      hint: threshold > 0 ? "Cart totals above this ship free" : "Every order pays delivery",
      tone: threshold > 0 ? "good" : "off",
      icon: Truck,
    },
  ];
  return (
    <SaveableSection
      fields={["freeDeliveryThresholdRupees"] as const}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={<SettingsTabHero metrics={heroMetrics} />}
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
          hint="Cart totals at or above this amount ship for free. Set to 0 to charge delivery on every order."
          disabled={!canUpdate}
        />
      </FormSection>
    </SaveableSection>
  );
}

function SocialSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const tone = (value: string): SettingsHeroMetricTone => (value.trim() ? "good" : "off");
  const heroMetrics: SettingsHeroMetric[] = [
    {
      label: "Facebook",
      value: draft.socialFacebook ? "Linked" : "Off",
      tone: tone(draft.socialFacebook),
      icon: Share2,
    },
    {
      label: "Instagram",
      value: draft.socialInstagram ? "Linked" : "Off",
      tone: tone(draft.socialInstagram),
      icon: Share2,
    },
    {
      label: "TikTok",
      value: draft.socialTiktok ? "Linked" : "Off",
      tone: tone(draft.socialTiktok),
      icon: Sparkles,
    },
    {
      label: "YouTube",
      value: draft.socialYoutube ? "Linked" : "Off",
      tone: tone(draft.socialYoutube),
      icon: Video,
    },
    {
      label: "Maps",
      value: draft.socialGoogleMaps ? "Linked" : "Off",
      tone: tone(draft.socialGoogleMaps),
      icon: MapPin,
    },
  ];
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.social}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={
        <SettingsTabHero
          description="Linked profiles appear in the footer and on the About page. Leave a row blank to hide that platform."
          metrics={heroMetrics}
        />
      }
    >
      <FormSection title="Social profiles" description="Linked from the footer and about page.">
        <FormGrid>
          <TextField
            label="Facebook URL"
            type="url"
            value={draft.socialFacebook}
            onChange={(event) => setField("socialFacebook", event.target.value)}
            placeholder="https://facebook.com/yourstore"
            inputMode="url"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Instagram URL"
            type="url"
            value={draft.socialInstagram}
            onChange={(event) => setField("socialInstagram", event.target.value)}
            placeholder="https://instagram.com/yourstore"
            inputMode="url"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="TikTok URL"
            type="url"
            value={draft.socialTiktok}
            onChange={(event) => setField("socialTiktok", event.target.value)}
            placeholder="https://tiktok.com/@yourstore"
            inputMode="url"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="YouTube URL"
            type="url"
            value={draft.socialYoutube}
            onChange={(event) => setField("socialYoutube", event.target.value)}
            placeholder="https://youtube.com/@yourstore"
            inputMode="url"
            disabled={!canUpdate}
            containerClassName="max-w-md"
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
            containerClassName="max-w-md"
          />
        </FormGrid>
      </FormSection>
    </SaveableSection>
  );
}

function LoyaltySettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const heroMetrics: SettingsHeroMetric[] = [
    {
      label: "Earn rate",
      value: draft.loyaltyEarnPercent > 0 ? `${draft.loyaltyEarnPercent}% back` : "Off",
      hint: "Points awarded per Rupee on paid orders",
      tone: draft.loyaltyEarnPercent > 0 ? "good" : "off",
      icon: Gift,
    },
    {
      label: "Review bonus",
      value: `${draft.loyaltyReviewBonusPoints || 0} pts`,
      hint: "Awarded on verified reviews",
      tone: draft.loyaltyReviewBonusPoints > 0 ? "good" : "neutral",
      icon: Sparkles,
    },
    {
      label: "Referral bonus",
      value: `${draft.loyaltyReferralBonusPoints || 0} pts × 2`,
      hint: "Both sides on a successful referral",
      tone: draft.loyaltyReferralBonusPoints > 0 ? "good" : "neutral",
      icon: Gift,
    },
  ];
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.loyalty}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={<SettingsTabHero metrics={heroMetrics} />}
    >
      <FormSection
        title="Loyalty programme"
        description="Earn rate and bonus values shown on the account dashboard and checkout."
      >
        <FormGrid cols={3}>
          <NumberField
            label="Earn rate (% of order total)"
            value={draft.loyaltyEarnPercent}
            onChange={(value) => setField("loyaltyEarnPercent", value)}
            trailingAddon="%"
            placeholder="e.g. 1"
            hint="Points earned per Rupee on a paid order."
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
        </FormGrid>
      </FormSection>
    </SaveableSection>
  );
}

function PolicySettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const heroMetrics: SettingsHeroMetric[] = [
    {
      label: "Moneyback window",
      value: `${draft.moneybackDays} days`,
      hint: "Customers can request a refund within this period",
      tone: draft.moneybackDays > 0 ? "good" : "warn",
      icon: ShieldCheck,
    },
    {
      label: "Default warranty",
      value: `${draft.defaultWarrantyMonths} months`,
      hint: "Used when a product doesn't override its warranty",
      tone: draft.defaultWarrantyMonths > 0 ? "good" : "warn",
      icon: ShieldCheck,
    },
  ];
  return (
    <SaveableSection
      fields={["moneybackDays", "defaultWarrantyMonths"] as const}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={<SettingsTabHero metrics={heroMetrics} />}
    >
      <FormSection
        title="Customer policies"
        description="Policy values surfaced on product pages, FAQs and dispatch confirmations."
      >
        <FormGrid>
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
        </FormGrid>
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
  /** Optional content rendered above the form (e.g. <SettingsTabHero />). */
  hero?: ReactNode;
}

function SaveableSection({
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

function NumberField({
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
