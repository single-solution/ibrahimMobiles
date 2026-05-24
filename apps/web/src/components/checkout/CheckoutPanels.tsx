"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CreditCard,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  User,
} from "lucide-react";
import {
  LOYALTY_MAX_REDEEM_PERCENT,
  LOYALTY_MIN_REDEEM,
  LOYALTY_PROGRAM_NAME,
  classNames,
  formatPoints,
  formatPrice,
  getPaymentMethods,
  pointsToRupees,
} from "@store/shared";
import { PhoneOtpForm } from "@/components/account/PhoneOtpForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

export type DeliveryMethod = "pickup" | "delivery";
export type PaymentMethodId = "bank" | "easypaisa" | "jazzcash" | "cod";

export interface AddressFormState {
  recipientName: string;
  area: string;
  street: string;
  postalCode: string;
}

export function EmptyCartState() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <span className="grid mx-auto mb-4 size-12 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[var(--color-ink-500)]">
        <ShoppingBag size={20} />
      </span>
      <h1 className="font-headline text-3xl font-semibold tracking-tight text-[var(--color-ink-900)]">
        Your cart is empty
      </h1>
      <p className="mt-3 text-[14px] text-[var(--color-ink-600)]">
        Browse the shop, pick a phone or accessory, then come back here to check out.
      </p>
      <Link
        href="/shop"
        className="cta-arrow mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--color-accent-500)] px-5 text-[14px] font-semibold text-[var(--color-ink-900)]"
      >
        Visit the shop
        <ArrowUpRight size={16} strokeWidth={2.4} />
      </Link>
    </div>
  );
}

export function CheckoutHeader() {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <Link
          href="/shop"
          className="cta-arrow tap inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink-500)] hover:text-[var(--color-ink-800)]"
        >
          <ArrowLeft size={13} />
          Back to shop
        </Link>
        <h1 className="mt-2 font-headline text-[34px] font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)] md:text-[44px]">
          Checkout
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-ink-500)] md:text-sm">
          Confirm your contact, address and payment — we&rsquo;ll do the rest.
        </p>
      </div>
      <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-800 md:inline-flex">
        <ShieldCheck size={13} />
        Secure · 15-day moneyback
      </div>
    </div>
  );
}

export function CheckoutSignInPanel() {
  const router = useRouter();

  return (
    <Card className="p-5 md:p-6">
      <PanelHeader
        icon={<ShieldCheck size={14} />}
        eyebrow="Sign in required"
        title="Verify your phone to checkout"
      />
      <p className="mt-2 text-[13px] text-[var(--color-ink-500)]">
        We use your phone number for order updates and to keep your order history in one account.
      </p>
      <div className="mt-5">
        <PhoneOtpForm
          phoneSubmitLabel="Send OTP"
          codeSubmitLabel="Verify and continue"
          onVerified={() => router.refresh()}
        />
      </div>
    </Card>
  );
}

export function CheckoutErrorMessage({ message }: { message: string }) {
  return (
    <p className="rounded-[var(--radius-md)] border border-[var(--color-error-200)] bg-[var(--color-error-50)] px-3 py-2 text-[12.5px] text-[var(--color-error-700)]">
      {message}
    </p>
  );
}

export function OrderSummaryPreview({
  totals,
  delivery,
  payment,
}: {
  totals: {
    itemCount: number;
    subtotalRupees: number;
    discountRupees: number;
    deliveryRupees: number;
    pointsRedeemedRupees: number;
    totalRupees: number;
  };
  delivery: DeliveryMethod;
  payment: PaymentMethodId;
}) {
  return (
    <OrderSummaryPanel
      totals={totals}
      payment={payment}
      delivery={delivery}
      hasAgreed
      onAgreedChange={() => undefined}
      onPlaceOrder={() => undefined}
      isPlacing={false}
      isValid={false}
      pointsEarnedOnThisOrder={0}
      pointsRedeemed={0}
      errorMessage="Sign in to place this order."
    />
  );
}

export interface ContactPanelProps {
  fullName: string;
  phoneNumber: string;
  onFullName: (value: string) => void;
}

export function ContactPanel({
  fullName,
  phoneNumber,
  onFullName,
}: ContactPanelProps) {
  return (
    <Card className="p-4 md:p-5">
      <PanelHeader icon={<User size={14} />} eyebrow="01 · Contact" title="Who is this order for?" />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field
          label="Full name"
          value={fullName}
          onChange={onFullName}
          icon={<User size={14} />}
          autoComplete="name"
        />
        <Field
          label="Phone"
          value={phoneNumber}
          onChange={() => undefined}
          icon={<Phone size={14} />}
          autoComplete="tel"
          inputMode="tel"
          isReadOnly
        />
      </div>
    </Card>
  );
}

export interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  icon?: React.ReactNode;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  isReadOnly?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}

export function Field({
  label,
  value,
  onChange,
  onBlur,
  icon,
  autoComplete,
  inputMode,
  placeholder,
  isReadOnly,
  inputRef,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {label}
      </span>
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]">
            {icon}
          </span>
        )}
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          readOnly={isReadOnly}
          className={classNames(
            "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] text-sm text-[var(--color-ink-900)] transition-colors placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)]/30",
            isReadOnly ? "cursor-not-allowed opacity-70" : "",
            icon ? "pl-9 pr-3" : "px-3.5",
          )}
        />
      </span>
    </label>
  );
}

export interface DeliveryPanelProps {
  delivery: DeliveryMethod;
  onChange: (value: DeliveryMethod) => void;
  address: AddressFormState;
  onAddressChange: (next: AddressFormState) => void;
}

export function DeliveryPanel({
  delivery,
  onChange,
  address,
  onAddressChange,
}: DeliveryPanelProps) {
  const settings = useStoreSettings();
  return (
    <Card className="p-4 md:p-5">
      <PanelHeader
        icon={<Truck size={14} />}
        eyebrow="02 · Delivery"
        title="How should we get this to you?"
      />
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <ChoiceTile
          icon={<Store size={15} />}
          title="Pickup at Hassan Centre"
          subtitle={`${settings.storeAddressLine1} · ${settings.storeHours}`}
          tag="Free"
          tagTone="success"
          isSelected={delivery === "pickup"}
          onSelect={() => onChange("pickup")}
        />
        <ChoiceTile
          icon={<Truck size={15} />}
          title="Door delivery"
          subtitle="Pakistan-wide via Pakistan Post · 2–4 working days"
          tag="Rs 1,500"
          isSelected={delivery === "delivery"}
          onSelect={() => onChange("delivery")}
        />
      </div>

      {delivery === "delivery" && (
        <div className="mt-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
            Delivery address
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Recipient name"
              value={address.recipientName}
              onChange={(value) => onAddressChange({ ...address, recipientName: value })}
              autoComplete="shipping name"
            />
            <Field
              label="Area / locality"
              value={address.area}
              onChange={(value) => onAddressChange({ ...address, area: value })}
              autoComplete="shipping address-level3"
            />
            <Field
              label="Street address"
              value={address.street}
              onChange={(value) => onAddressChange({ ...address, street: value })}
              autoComplete="shipping street-address"
            />
            <Field
              label="Postal code"
              value={address.postalCode}
              onChange={(value) => onAddressChange({ ...address, postalCode: value })}
              autoComplete="shipping postal-code"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

export interface PaymentPanelProps {
  payment: PaymentMethodId;
  onChange: (id: PaymentMethodId) => void;
}

export function PaymentPanel({ payment, onChange }: PaymentPanelProps) {
  const settings = useStoreSettings();
  const paymentMethods = getPaymentMethods(settings);
  const bankDiscount = Math.max(0, settings.bankTransferDiscountPercent);
  return (
    <Card className="p-4 md:p-5">
      <PanelHeader
        icon={<CreditCard size={14} />}
        eyebrow="03 · Payment"
        title="How would you like to pay?"
      />
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {paymentMethods.map((method) => (
          <ChoiceTile
            key={method.id}
            icon={<Building2 size={15} />}
            title={method.label}
            subtitle={method.note}
            tag={method.id === "bank" && bankDiscount > 0 ? `−${bankDiscount}%` : undefined}
            tagTone="success"
            isSelected={payment === method.id}
            onSelect={() => onChange(method.id)}
          />
        ))}
      </div>
    </Card>
  );
}

export interface LoyaltyPanelProps {
  balance: number;
  maxPointsForOrder: number;
  shouldRedeemLoyalty: boolean;
  onToggle: (next: boolean) => void;
}

export function LoyaltyPanel({
  balance,
  maxPointsForOrder,
  shouldRedeemLoyalty,
  onToggle,
}: LoyaltyPanelProps) {
  const cantRedeem = maxPointsForOrder < LOYALTY_MIN_REDEEM;
  const valueInRupees = pointsToRupees(maxPointsForOrder);
  const isOn = shouldRedeemLoyalty && !cantRedeem;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-accent-50)] px-4 py-3 md:px-5">
        <PanelHeader
          icon={<Sparkles size={14} />}
          eyebrow={`04 · ${LOYALTY_PROGRAM_NAME}`}
          title="Use your points"
        />
        <div className="text-right">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-700)]">
            Available
          </p>
          <p className="font-mono text-[15px] font-semibold tracking-tight text-[var(--color-accent-800)]">
            {formatPoints(balance)}
          </p>
        </div>
      </div>

      <div className="p-4 md:p-5">
        {cantRedeem ? (
          <p className="text-[12.5px] text-[var(--color-ink-500)]">
            Need at least {LOYALTY_MIN_REDEEM} points to redeem on this order. Keep shopping
            and your points will pile up — capped at {LOYALTY_MAX_REDEEM_PERCENT}% of any
            order.
          </p>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={isOn}
            onClick={() => onToggle(!isOn)}
            className={classNames(
              "tap flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors md:p-3.5",
              isOn
                ? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)]"
                : "border-[var(--color-ink-100)] bg-[var(--color-canvas)] hover:border-[var(--color-ink-200)]",
            )}
          >
            <span className="min-w-0">
              <span
                className={classNames(
                  "block text-[13.5px] font-semibold tracking-tight",
                  isOn ? "text-[var(--color-accent-800)]" : "text-[var(--color-ink-900)]",
                )}
              >
                {isOn
                  ? `Applying ${formatPoints(maxPointsForOrder)}`
                  : `Apply ${formatPoints(maxPointsForOrder)}`}
              </span>
              <span className="mt-0.5 block text-[12px] text-[var(--color-ink-600)]">
                {isOn
                  ? `Saving ${formatPrice(valueInRupees)} on this order — max allowed (${LOYALTY_MAX_REDEEM_PERCENT}% cap).`
                  : `Save ${formatPrice(valueInRupees)} — we'll auto-apply the max we can on this order.`}
              </span>
            </span>
            <span
              aria-hidden
              className={classNames(
                "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors",
                isOn ? "bg-[var(--color-accent-500)]" : "bg-[var(--color-ink-200)]",
              )}
            >
              <span
                className={classNames(
                  "inline-block size-5 transform rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform",
                  isOn ? "translate-x-[18px]" : "translate-x-[2px]",
                )}
              />
            </span>
          </button>
        )}
      </div>
    </Card>
  );
}

export interface OrderSummaryPanelProps {
  totals: {
    itemCount: number;
    subtotalRupees: number;
    discountRupees: number;
    deliveryRupees: number;
    pointsRedeemedRupees: number;
    totalRupees: number;
  };
  payment: PaymentMethodId;
  delivery: DeliveryMethod;
  hasAgreed: boolean;
  onAgreedChange: (value: boolean) => void;
  onPlaceOrder: () => void;
  isPlacing: boolean;
  isValid: boolean;
  pointsEarnedOnThisOrder: number;
  pointsRedeemed: number;
  errorMessage: string | null;
}

export function OrderSummaryPanel({
  totals,
  payment,
  delivery,
  hasAgreed,
  onAgreedChange,
  onPlaceOrder,
  isPlacing,
  isValid,
  pointsEarnedOnThisOrder,
  pointsRedeemed,
  errorMessage,
}: OrderSummaryPanelProps) {
  const settings = useStoreSettings();
  const paymentMethods = getPaymentMethods(settings);
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 p-4 md:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Order summary
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-ink-700)]">
          {totals.itemCount} {totals.itemCount === 1 ? "phone" : "phones"} · paying with{" "}
          <span className="font-semibold text-[var(--color-ink-900)]">
            {paymentMethods.find((method) => method.id === payment)?.label}
          </span>
        </p>
      </div>

      <div className="space-y-2.5 p-4 md:p-5">
        <SummaryRow label="Subtotal" value={formatPrice(totals.subtotalRupees)} />
        {totals.discountRupees > 0 && (
          <SummaryRow
            label="Bank transfer discount"
            value={`− ${formatPrice(totals.discountRupees)}`}
            tone="success"
          />
        )}
        <SummaryRow
          label={delivery === "pickup" ? "Pickup" : "Delivery"}
          value={
            totals.deliveryRupees > 0 ? formatPrice(totals.deliveryRupees) : "Free"
          }
          tone={totals.deliveryRupees > 0 ? "default" : "success"}
        />
        {totals.pointsRedeemedRupees > 0 && (
          <SummaryRow
            label={`${LOYALTY_PROGRAM_NAME} (${pointsRedeemed.toLocaleString("en-PK")} pts)`}
            value={`− ${formatPrice(totals.pointsRedeemedRupees)}`}
            tone="success"
          />
        )}
        <hr className="border-[var(--color-ink-100)]" />
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-700)]">
            Total
          </p>
          <p className="text-[20px] font-semibold tracking-tight text-[var(--color-ink-900)]">
            {formatPrice(totals.totalRupees)}
          </p>
        </div>
        {pointsEarnedOnThisOrder > 0 && (
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent-50)] px-3 py-2 text-[12px] text-[var(--color-accent-800)]">
            <Sparkles size={13} className="shrink-0" />
            <span>
              You&rsquo;ll earn{" "}
              <span className="font-semibold">
                {formatPoints(pointsEarnedOnThisOrder)}
              </span>{" "}
              on this order
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/40 p-4 md:p-5">
        {errorMessage && (
          <p
            role="alert"
            className="rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800"
          >
            {errorMessage}
          </p>
        )}
        <label className="flex items-start gap-2.5 text-[12.5px] text-[var(--color-ink-700)]">
          <input
            type="checkbox"
            checked={hasAgreed}
            onChange={(event) => onAgreedChange(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-[var(--color-ink-300)] text-[var(--color-accent-600)] focus:ring-[var(--color-accent-500)]"
          />
          <span>
            I&rsquo;ve reviewed my order and agree to the 15-day moneyback &amp;{" "}
            <Link href="#" className="link-underline text-[var(--color-accent-700)]">
              return policy
            </Link>
            .
          </span>
        </label>
        <Button
          variant="primary"
          size="md"
          className="cta-arrow w-full"
          onClick={onPlaceOrder}
          disabled={!isValid || isPlacing}
          isLoading={isPlacing}
          trailingIcon={!isPlacing ? <ArrowUpRight size={16} strokeWidth={2.4} /> : undefined}
        >
          {isPlacing ? "Placing order…" : "Place order"}
        </Button>
        <p className="text-center text-[11px] text-[var(--color-ink-500)]">
          By placing this order you agree to be contacted for verification.
        </p>
      </div>
    </Card>
  );
}

export interface PanelHeaderProps {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
}

export function PanelHeader({ icon, eyebrow, title }: PanelHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-700)]">
          <span className="grid size-5 place-items-center rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
            {icon}
          </span>
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-[15px] font-semibold text-[var(--color-ink-900)] md:text-base">
          {title}
        </h2>
      </div>
    </div>
  );
}

export interface ChoiceTileProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tag?: string;
  tagTone?: "default" | "success";
  isSelected: boolean;
  onSelect: () => void;
}

export function ChoiceTile({
  icon,
  title,
  subtitle,
  tag,
  tagTone = "default",
  isSelected,
  onSelect,
}: ChoiceTileProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={classNames(
        "tap flex h-full items-start gap-3 rounded-[var(--radius-lg)] border p-3 text-left transition-colors",
        isSelected
          ? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)]"
          : "border-[var(--color-ink-100)] bg-[var(--color-canvas)] hover:border-[var(--color-ink-200)]",
      )}
    >
      <span
        className={classNames(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)]",
          isSelected
            ? "bg-[var(--color-accent-600)] text-white"
            : "bg-[var(--color-canvas-deep)] text-[var(--color-ink-700)]",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13.5px] font-semibold text-[var(--color-ink-900)]">{title}</p>
          {tag && (
            <span
              className={classNames(
                "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                tagTone === "success"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-[var(--color-ink-100)] text-[var(--color-ink-700)]",
              )}
            >
              {tag}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--color-ink-600)]">
          {subtitle}
        </p>
      </div>
    </button>
  );
}

export interface SummaryRowProps {
  label: string;
  value: string;
  tone?: "default" | "success";
}

export function SummaryRow({ label, value, tone = "default" }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-[var(--color-ink-600)]">{label}</span>
      <span
        className={classNames(
          "font-medium",
          tone === "success" ? "text-emerald-700" : "text-[var(--color-ink-900)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}
