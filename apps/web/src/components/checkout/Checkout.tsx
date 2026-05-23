"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  maxRedeemable,
  pointsEarnedFor,
  pointsToRupees,
} from "@store/shared";
import { useCart } from "@/lib/cart/useCart";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";
import type { AccountAddress, AccountCustomer } from "@/lib/storefront/account";
import {
  CheckoutHeader,
  CheckoutSignInPanel,
  ContactPanel,
  DeliveryPanel,
  EmptyCartState,
  LoyaltyPanel,
  OrderSummaryPanel,
  OrderSummaryPreview,
  PaymentPanel,
  type AddressFormState,
  type DeliveryMethod,
  type PaymentMethodId,
} from "@/components/checkout/CheckoutPanels";

const DELIVERY_FEE_RUPEES = 1_500;

const PAYMENT_API_VALUE: Record<PaymentMethodId, "bank-transfer" | "easypaisa" | "jazzcash" | "cod"> = {
  bank: "bank-transfer",
  easypaisa: "easypaisa",
  jazzcash: "jazzcash",
  cod: "cod",
};

const EMPTY_ADDRESS: AddressFormState = {
  recipientName: "",
  area: "",
  street: "",
  postalCode: "",
};

interface CheckoutProps {
  customer: AccountCustomer | null;
}

const PLACEHOLDER_CUSTOMER_NAME_PATTERN = /^Customer\s+\d{4}$/;

function hasRealCustomerName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && !PLACEHOLDER_CUSTOMER_NAME_PATTERN.test(trimmed);
}

function addressToForm(address: AccountAddress | undefined): AddressFormState {
  if (!address) {
    return EMPTY_ADDRESS;
  }
  return {
    recipientName: address.recipientName,
    area: address.area ?? "",
    street: address.street ?? "",
    postalCode: address.postalCode ?? "",
  };
}

export function Checkout({ customer }: CheckoutProps) {
  const router = useRouter();
  const cart = useCart();
  const settings = useStoreSettings();

  const defaultAddress =
    customer?.addresses.find((candidate) => candidate.isDefault) ??
    customer?.addresses[0];
  const [fullName, setFullName] = useState(
    customer && hasRealCustomerName(customer.name) ? customer.name : "",
  );
  const [phoneNumber, setPhoneNumber] = useState(customer?.phoneNumber ?? "");
  const [delivery, setDelivery] = useState<DeliveryMethod>("pickup");
  const [address, setAddress] = useState<AddressFormState>(() =>
    addressToForm(defaultAddress),
  );
  const [payment, setPayment] = useState<PaymentMethodId>("bank");
  const [hasAgreed, setHasAgreed] = useState<boolean>(false);
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

  const pointsEarnedOnThisOrder = pointsEarnedFor(
    totals.totalRupees,
    settings.loyaltyEarnPercent,
  );

  const isAddressValid =
    delivery === "pickup" ||
    (address.recipientName.trim().length >= 2 &&
      address.street.trim().length >= 2);

  const isValid =
    !cart.isEmpty &&
    fullName.trim().length > 1 &&
    phoneNumber.trim().length >= 7 &&
    isAddressValid &&
    hasAgreed;

  const lookupLoyalty = async (phoneOverride = phoneNumber) => {
    const lookupPhone = phoneOverride.trim();
    if (lookupPhone.length < 7) {
      return;
    }
    try {
      const response = await fetch("/api/storefront/loyalty-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: lookupPhone }),
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

  useEffect(() => {
    if (!customer?.phoneNumber) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void lookupLoyalty(customer.phoneNumber);
    }, 0);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one lookup when the signed-in customer changes
  }, [customer?.phoneNumber]);

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
          customer: { name: fullName },
          delivery: delivery === "delivery" ? "courier" : "pickup",
          payment: PAYMENT_API_VALUE[payment],
          address:
            delivery === "delivery"
              ? {
                  recipientName: address.recipientName || fullName,
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
          loyalty: {
            redeemPoints: cappedPointsToUse,
          },
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setErrorMessage(data?.error ?? "Could not place your order. Please try again.");
        setIsPlacing(false);
        return;
      }

      const data = (await response.json()) as {
        orderNumber: string;
        pointsEarned?: number;
        pointsRedeemed?: number;
      };
      cart.clear();
      const params = new URLSearchParams({
        order: data.orderNumber,
        earned: String(data.pointsEarned ?? pointsEarnedOnThisOrder),
      });
      const serverRedeemed = data.pointsRedeemed ?? cappedPointsToUse;
      if (serverRedeemed > 0) {
        params.set("redeemed", String(serverRedeemed));
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

  if (!customer) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8">
        <CheckoutHeader />
        <div className="mt-5 grid gap-6 md:mt-8 md:grid-cols-[minmax(0,1fr)_360px] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
          <CheckoutSignInPanel />
          <aside className="space-y-3 md:space-y-4">
            <OrderSummaryPreview totals={totals} delivery={delivery} payment={payment} />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8">
      <CheckoutHeader />

      <div className="mt-5 grid gap-6 md:mt-8 md:grid-cols-[1fr_360px] lg:grid-cols-[1fr_400px] lg:gap-8">
        <div className="space-y-3 md:space-y-4">
          <ContactPanel
            fullName={fullName}
            phoneNumber={phoneNumber}
            onFullName={setFullName}
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
