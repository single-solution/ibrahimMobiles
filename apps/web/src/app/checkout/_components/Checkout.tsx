"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CHECKOUT_TO_ORDER_PAYMENT, maxRedeemable, pointsEarnedFor, pointsToRupees } from "@store/shared";
import { useCart } from "@/lib/cart/useCart";
import { useActiveOffers } from "@/lib/pricing/useActiveOffers";
import { evaluateCartOffers } from "@store/shared";
import { buildCartLineOfferIds } from "@/lib/pricing/cartOfferPricing";
import { CheckoutOfferNotices } from "@/components/shared/CheckoutOfferNotices";
import { useStoreSettings } from "@/lib/core/storeSettingsContext";
import { useNavigationTransition } from "@/lib/navigation/navigationProgress";
import type { AccountAddress, AccountCustomer } from "@/lib/core/account";
import { STOREFRONT_SHELL_CLASS } from "@/lib/layout/storefrontShell";
import { resolvePublicErrorMessage } from "@/lib/errors/publicErrorMessage";
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
} from "@/app/checkout/_components/CheckoutPanels";

const DELIVERY_FEE_RUPEES = 1_500;

const EMPTY_ADDRESS: AddressFormState = {
	street: "",
};

interface CheckoutProps {
	customer: AccountCustomer | null;
}

function addressToForm(address: AccountAddress | undefined): AddressFormState {
	if (!address) {
		return EMPTY_ADDRESS;
	}
	return {
		street: address.street ?? "",
	};
}

export function Checkout({ customer }: CheckoutProps) {
	const router = useRouter();
	const { startNavigation } = useNavigationTransition();
	const cart = useCart();
	const settings = useStoreSettings();
	const { offers } = useActiveOffers();

	const [payment, setPayment] = useState<PaymentMethodId>("bank");

	const evaluatableItems = useMemo(
		() =>
			cart.items.map((item) => ({
				id: item.id,
				productId: item.productId,
				variantId: item.variantId,
				categorySlug: item.categorySlug,
				brandSlug: item.brandSlug,
				gradeSlug: item.gradeSlug,
				price: item.unitPriceRupees,
				quantity: item.quantity,
				attributes: item.attributes,
			})),
		[cart.items],
	);

	const pricing = useMemo(
		() =>
			evaluateCartOffers(evaluatableItems, offers, {
				paymentMethod: payment,
				lineOfferIds: buildCartLineOfferIds(cart.items),
			}),
		[evaluatableItems, offers, payment, cart.items],
	);

	const defaultAddress = customer?.addresses.find((candidate) => candidate.isDefault) ?? customer?.addresses[0];
	const [fullName, setFullName] = useState(customer?.name ?? "");
	const [phoneNumber, setPhoneNumber] = useState(customer?.phoneNumber ?? "");
	const [delivery, setDelivery] = useState<DeliveryMethod>("pickup");
	const [address, setAddress] = useState<AddressFormState>(() => addressToForm(defaultAddress));
	const [hasAgreed, setHasAgreed] = useState<boolean>(false);
	const [isPlacing, setIsPlacing] = useState<boolean>(false);
	const [shouldRedeemLoyalty, setShouldRedeemLoyalty] = useState<boolean>(false);
	const [loyaltyBalance, setLoyaltyBalance] = useState<number>(0);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// Stable across retries of the same attempt so a double-click / flaky network
	// can't place two orders; reset only after a confirmed success.
	const idempotencyKeyRef = useRef<string | null>(null);

	const subtotalRupees = cart.subtotalRupees;

	const maxPointsForOrder = useMemo(() => maxRedeemable(subtotalRupees, loyaltyBalance), [subtotalRupees, loyaltyBalance]);

	const cappedPointsToUse = shouldRedeemLoyalty ? maxPointsForOrder : 0;

	const totals = useMemo(() => {
		const itemCount = cart.itemCount;
		const subtotalRupees = pricing.finalTotal;
		const discountRupees = payment === "bank" ? Math.round((subtotalRupees * settings.bankTransferDiscountPercent) / 100) : 0;
		const deliveryRupees = delivery === "delivery" ? (subtotalRupees >= settings.freeDeliveryThresholdRupees ? 0 : DELIVERY_FEE_RUPEES) : 0;
		const pointsRedeemedRupees = pricing.isLoyaltyPointsAllowed ? pointsToRupees(cappedPointsToUse) : 0;
		const totalRupees = Math.max(0, subtotalRupees - discountRupees + deliveryRupees - pointsRedeemedRupees);
		return {
			itemCount,
			subtotalRupees: cart.subtotalRupees,
			offersDiscountRupees: pricing.totalDiscount,
			discountRupees,
			deliveryRupees,
			pointsRedeemedRupees,
			totalRupees,
		};
	}, [
		cart.itemCount,
		cart.subtotalRupees,
		pricing.finalTotal,
		pricing.totalDiscount,
		pricing.isLoyaltyPointsAllowed,
		delivery,
		payment,
		cappedPointsToUse,
		settings.bankTransferDiscountPercent,
		settings.freeDeliveryThresholdRupees,
	]);

	const pointsEarnedOnThisOrder = pointsEarnedFor(totals.totalRupees, settings.loyaltyEarnPercent);

	const isAddressValid = delivery === "pickup" || address.street.trim().length >= 2;

	const isValid = !cart.isEmpty && fullName.trim().length > 1 && phoneNumber.trim().length >= 7 && isAddressValid && hasAgreed;

	const lookupLoyalty = async (phoneOverride = phoneNumber) => {
		const lookupPhone = phoneOverride.trim();
		if (lookupPhone.length < 7) {
			return;
		}
		try {
			const response = await fetch("/api/loyalty-balance", {
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
		if (!idempotencyKeyRef.current) {
			idempotencyKeyRef.current = crypto.randomUUID();
		}
		try {
			const response = await fetch("/api/orders", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					customer: { name: fullName },
					delivery: delivery === "delivery" ? "courier" : "pickup",
					payment: CHECKOUT_TO_ORDER_PAYMENT[payment],
					address:
						delivery === "delivery"
							? {
									recipientName: fullName,
									street: address.street || undefined,
								}
							: undefined,
					items: cart.items.map((line) => ({
						productId: line.productId,
						variantId: line.variantId,
						quantity: line.quantity,
						...(line.appliedOfferId ? { appliedOfferId: line.appliedOfferId } : {}),
					})),
					loyalty: {
						redeemPoints: cappedPointsToUse,
					},
					idempotencyKey: idempotencyKeyRef.current,
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
				totalRupees?: number;
				pointsEarned?: number;
				pointsRedeemed?: number;
			};
			cart.clear();
			const params = new URLSearchParams({
				order: data.orderNumber,
				payment,
				total: String(data.totalRupees ?? totals.totalRupees),
				earned: String(data.pointsEarned ?? pointsEarnedOnThisOrder),
			});
			const serverRedeemed = data.pointsRedeemed ?? cappedPointsToUse;
			if (serverRedeemed > 0) {
				params.set("redeemed", String(serverRedeemed));
			}
			// Order confirmed — the next placement should get a fresh key.
			idempotencyKeyRef.current = null;
			const url = `/checkout/success?${params.toString()}`;
			startNavigation(() => router.push(url));
		} catch (error) {
			setErrorMessage(resolvePublicErrorMessage(error, "Could not place your order. Please try again."));
			setIsPlacing(false);
		}
	};

	if (cart.isEmpty) {
		return <EmptyCartState />;
	}

	if (!customer) {
		return (
			<div className={`${STOREFRONT_SHELL_CLASS} pb-24 pt-4 md:pb-16 md:pt-10`}>
				<CheckoutHeader />
				<div className="reveal mt-4 md:mt-5">
					<CheckoutOfferNotices offers={offers} />
				</div>
				<div className="mt-5 grid gap-6 md:mt-8 md:grid-cols-[minmax(0,1fr)_360px] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
					<div className="reveal">
						<CheckoutSignInPanel />
					</div>
					<aside className="space-y-3 md:space-y-4">
						<div className="reveal">
							<OrderSummaryPreview totals={totals} delivery={delivery} payment={payment} />
						</div>
					</aside>
				</div>
			</div>
		);
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void handlePlaceOrder();
			}}
			className={`${STOREFRONT_SHELL_CLASS} pb-24 pt-4 md:pb-16 md:pt-10`}
		>
			<CheckoutHeader />

			<div className="reveal mt-4 md:mt-5">
				<CheckoutOfferNotices offers={offers} />
			</div>

			<div className="mt-5 grid gap-6 md:mt-8 md:grid-cols-[1fr_360px] lg:grid-cols-[1fr_400px] lg:gap-8">
				<div className="reveal-stagger space-y-3 md:space-y-4">
					<div className="reveal">
						<ContactPanel fullName={fullName} phoneNumber={phoneNumber} onFullName={setFullName} isPlacing={isPlacing} />
					</div>
					<div className="reveal">
						<DeliveryPanel delivery={delivery} onChange={setDelivery} address={address} onAddressChange={setAddress} isPlacing={isPlacing} />
					</div>
					<div className="reveal">
						<PaymentPanel payment={payment} onChange={setPayment} isPlacing={isPlacing} />
					</div>
				</div>

				<aside className="reveal-stagger space-y-3 md:space-y-4">
					{loyaltyBalance > 0 && (
						<div className="reveal">
							<LoyaltyPanel
								balance={loyaltyBalance}
								maxPointsForOrder={maxPointsForOrder}
								shouldRedeemLoyalty={shouldRedeemLoyalty}
								onToggle={setShouldRedeemLoyalty}
								isAllowedWithOffers={pricing.isLoyaltyPointsAllowed}
							/>
						</div>
					)}
					<div className="reveal">
						<OrderSummaryPanel
							totals={totals}
							payment={payment}
							delivery={delivery}
							hasAgreed={hasAgreed}
							onAgreedChange={setHasAgreed}
							isPlacing={isPlacing}
							isValid={isValid}
							pointsEarnedOnThisOrder={pointsEarnedOnThisOrder}
							pointsRedeemed={cappedPointsToUse}
							errorMessage={errorMessage}
						/>
					</div>
				</aside>
			</div>
		</form>
	);
}
