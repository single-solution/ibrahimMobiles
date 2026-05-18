"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  LOYALTY_MAX_REDEEM_PERCENT,
  LOYALTY_MIN_REDEEM,
  LOYALTY_PROGRAM_NAME,
  PAYMENT_METHODS,
  classNames,
  formatPoints,
  formatPrice,
  maxRedeemable,
  pointsEarnedFor,
  pointsToRupees,
} from "@store/shared";
import { useCart } from "@/lib/cart/useCart";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

/** UI-side delivery (mirrors the server's `pickup` | `courier`). */
type DeliveryMethod = "pickup" | "delivery";

/**
 * UI-side payment method id used by the checkout flow. The server-side
 * `PaymentMethod` (`@store/db`) uses slightly different values; the
 * `PAYMENT_API_VALUE` table below maps between the two.
 */
type PaymentMethodId = "bank" | "easypaisa" | "jazzcash" | "cod";

/** Local default — server enforces the runtime free-delivery threshold from settings. */
const DELIVERY_FEE_RUPEES = 1_500;

/** Map the storefront UI's payment id to the API enum. Keep synced with the API. */
const PAYMENT_API_VALUE: Record<PaymentMethodId, "bank-transfer" | "easypaisa" | "jazzcash" | "cod"> = {
  bank: "bank-transfer",
  easypaisa: "easypaisa",
  jazzcash: "jazzcash",
  cod: "cod",
};

interface AddressFormState {
  recipientName: string;
  area: string;
  street: string;
  postalCode: string;
}

const EMPTY_ADDRESS: AddressFormState = {
  recipientName: "",
  area: "",
  street: "",
  postalCode: "",
};

export function CheckoutView() {
  const router = useRouter();
  const cart = useCart();
  const settings = useStoreSettings();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [city, setCity] = useState("");
  const [delivery, setDelivery] = useState<DeliveryMethod>("pickup");
  const [address, setAddress] = useState<AddressFormState>(EMPTY_ADDRESS);
  const [payment, setPayment] = useState<PaymentMethodId>("bank");
  const [hasAgreed, setHasAgreed] = useState<boolean>(true);
  const [isPlacing, setIsPlacing] = useState<boolean>(false);
  const [shouldRedeemLoyalty, setShouldRedeemLoyalty] = useState<boolean>(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subtotalRupees = cart.subtotalRupees;

  const maxPointsForOrder = useMemo(
    () => maxRedeemable(subtotalRupees, loyaltyBalance),
    [subtotalRupees, loyaltyBalance],
  );

  const cappedPointsToUse = shouldRedeemLoyalty ? maxPointsForOrder : 0;

  const totals = useMemo(() => {
    const itemCount = cart.itemCount;
    const discountRupees =
      payment === "bank"
        ? Math.round((subtotalRupees * settings.bankTransferDiscountPercent) / 100)
        : 0;
    const deliveryRupees =
      delivery === "delivery"
        ? subtotalRupees >= settings.freeDeliveryThresholdRupees
          ? 0
          : DELIVERY_FEE_RUPEES
        : 0;
    const pointsRedeemedRupees = pointsToRupees(cappedPointsToUse);
    const totalRupees = Math.max(
      0,
      subtotalRupees - discountRupees + deliveryRupees - pointsRedeemedRupees,
    );
    return {
      itemCount,
      subtotalRupees,
      discountRupees,
      deliveryRupees,
      pointsRedeemedRupees,
      totalRupees,
    };
  }, [
    cart.itemCount,
    subtotalRupees,
    delivery,
    payment,
    cappedPointsToUse,
    settings.bankTransferDiscountPercent,
    settings.freeDeliveryThresholdRupees,
  ]);

  const pointsEarnedOnThisOrder = pointsEarnedFor(totals.totalRupees);

  const isAddressValid =
    delivery === "pickup" ||
    (address.recipientName.trim().length >= 2 &&
      address.street.trim().length >= 2);

  const isValid =
    !cart.isEmpty &&
    fullName.trim().length > 1 &&
    phoneNumber.trim().length >= 7 &&
    city.trim().length >= 2 &&
    isAddressValid &&
    hasAgreed;

  /** Hit the public loyalty lookup endpoint — populates `loyaltyBalance` if the
   *  customer's phone is registered for the rewards programme. Silent on a miss. */
  const lookupLoyalty = async () => {
    if (phoneNumber.trim().length < 7) {
      return;
    }
    try {
      const response = await fetch("/api/storefront/loyalty-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { isMember: boolean; balance: number };
      setLoyaltyBalance(data.isMember ? data.balance : 0);
    } catch {
      // Network errors are non-fatal — checkout continues without loyalty.
    }
  };

  const handlePlaceOrder = async () => {
    if (!isValid || isPlacing) {
      return;
    }
    setErrorMessage(null);
    setIsPlacing(true);
    try {
      const response = await fetch("/api/storefront/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name: fullName, phoneNumber, city },
          delivery: delivery === "delivery" ? "courier" : "pickup",
          payment: PAYMENT_API_VALUE[payment],
          address:
            delivery === "delivery"
              ? {
                  recipientName: address.recipientName || fullName,
                  phoneNumber,
                  city,
                  area: address.area || undefined,
                  street: address.street || undefined,
                  postalCode: address.postalCode || undefined,
                }
              : undefined,
          items: cart.items.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setErrorMessage(data?.error ?? "Could not place your order. Please try again.");
        setIsPlacing(false);
        return;
      }

      const data = (await response.json()) as { orderNumber: string; pointsEarned?: number };
      cart.clear();
      const params = new URLSearchParams({
        order: data.orderNumber,
        // Trust the server's count over the client estimate — loyalty
        // membership might have flipped between page load and submit.
        earned: String(data.pointsEarned ?? pointsEarnedOnThisOrder),
      });
      if (cappedPointsToUse > 0) {
        params.set("redeemed", String(cappedPointsToUse));
      }
      router.push(`/checkout/success?${params.toString()}`);
    } catch {
      setErrorMessage("Network error — could not reach the server. Please try again.");
      setIsPlacing(false);
    }
  };

  if (cart.isEmpty) {
    return <EmptyCartState />;
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8">
      <CheckoutHeader />

      <div className="mt-5 grid gap-6 md:mt-8 md:grid-cols-[1fr_360px] lg:grid-cols-[1fr_400px] lg:gap-8">
        <div className="space-y-3 md:space-y-4">
          <ContactPanel
            fullName={fullName}
            phoneNumber={phoneNumber}
            city={city}
            onFullName={setFullName}
            onPhone={setPhoneNumber}
            onCity={setCity}
            onPhoneBlur={lookupLoyalty}
          />
          <DeliveryPanel
            delivery={delivery}
            onChange={setDelivery}
            address={address}
            onAddressChange={setAddress}
          />
          <PaymentPanel payment={payment} onChange={setPayment} />
        </div>

        <aside className="space-y-3 md:space-y-4">
          {loyaltyBalance > 0 && (
            <LoyaltyPanel
              balance={loyaltyBalance}
              maxPointsForOrder={maxPointsForOrder}
              shouldRedeemLoyalty={shouldRedeemLoyalty}
              onToggle={setShouldRedeemLoyalty}
            />
          )}
          <OrderSummaryPanel
            totals={totals}
            payment={payment}
            delivery={delivery}
            hasAgreed={hasAgreed}
            onAgreedChange={setHasAgreed}
            onPlaceOrder={handlePlaceOrder}
            isPlacing={isPlacing}
            isValid={isValid}
            pointsEarnedOnThisOrder={pointsEarnedOnThisOrder}
            pointsRedeemed={cappedPointsToUse}
            errorMessage={errorMessage}
          />
        </aside>
      </div>
    </div>
  );
}

/** Shown when the customer lands on /checkout with no items. */
function EmptyCartState() {
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

function CheckoutHeader() {
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

interface ContactPanelProps {
  fullName: string;
  phoneNumber: string;
  city: string;
  onFullName: (value: string) => void;
  onPhone: (value: string) => void;
  onCity: (value: string) => void;
  onPhoneBlur?: () => void;
}

function ContactPanel({
  fullName,
  phoneNumber,
  city,
  onFullName,
  onPhone,
  onCity,
  onPhoneBlur,
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
          onChange={onPhone}
          onBlur={onPhoneBlur}
          icon={<Phone size={14} />}
          autoComplete="tel"
          inputMode="tel"
        />
        <Field
          label="City"
          value={city}
          onChange={onCity}
          icon={<Store size={14} />}
          autoComplete="address-level2"
        />
      </div>
    </Card>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  icon?: React.ReactNode;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  icon,
  autoComplete,
  inputMode,
  placeholder,
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
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          className={classNames(
            "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] text-sm text-[var(--color-ink-900)] transition-colors placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)]/30",
            icon ? "pl-9 pr-3" : "px-3.5",
          )}
        />
      </span>
    </label>
  );
}

interface DeliveryPanelProps {
  delivery: DeliveryMethod;
  onChange: (value: DeliveryMethod) => void;
  address: AddressFormState;
  onAddressChange: (next: AddressFormState) => void;
}

function DeliveryPanel({
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

interface PaymentPanelProps {
  payment: PaymentMethodId;
  onChange: (id: PaymentMethodId) => void;
}

function PaymentPanel({ payment, onChange }: PaymentPanelProps) {
  return (
    <Card className="p-4 md:p-5">
      <PanelHeader
        icon={<CreditCard size={14} />}
        eyebrow="03 · Payment"
        title="How would you like to pay?"
      />
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {PAYMENT_METHODS.map((method) => (
          <ChoiceTile
            key={method.id}
            icon={<Building2 size={15} />}
            title={method.label}
            subtitle={method.note}
            tag={method.id === "bank" ? "−5%" : undefined}
            tagTone="success"
            isSelected={payment === method.id}
            onSelect={() => onChange(method.id)}
          />
        ))}
      </div>
    </Card>
  );
}

interface LoyaltyPanelProps {
  balance: number;
  maxPointsForOrder: number;
  shouldRedeemLoyalty: boolean;
  onToggle: (next: boolean) => void;
}

function LoyaltyPanel({
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

interface OrderSummaryPanelProps {
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

function OrderSummaryPanel({
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
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 p-4 md:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Order summary
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-ink-700)]">
          {totals.itemCount} {totals.itemCount === 1 ? "phone" : "phones"} · paying with{" "}
          <span className="font-semibold text-[var(--color-ink-900)]">
            {PAYMENT_METHODS.find((method) => method.id === payment)?.label}
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

interface PanelHeaderProps {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
}

function PanelHeader({ icon, eyebrow, title }: PanelHeaderProps) {
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

interface ChoiceTileProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tag?: string;
  tagTone?: "default" | "success";
  isSelected: boolean;
  onSelect: () => void;
}

function ChoiceTile({
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

interface SummaryRowProps {
  label: string;
  value: string;
  tone?: "default" | "success";
}

function SummaryRow({ label, value, tone = "default" }: SummaryRowProps) {
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
