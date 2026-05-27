"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import {
  buildPaymentInstructions,
  buildWhatsAppLink,
  CHECKOUT_TO_ORDER_PAYMENT,
  type OrderPaymentMethod,
  type PaymentInstructionAccountDetail,
  type PaymentMethodId,
} from "@store/shared";
import { Card } from "@/components/ui/Card";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

interface PaymentInstructionsCardProps {
  payment: OrderPaymentMethod | PaymentMethodId;
  orderNumber: string;
  totalRupees: number;
}

function resolveOrderPayment(
  payment: OrderPaymentMethod | PaymentMethodId,
): OrderPaymentMethod {
  if (payment === "bank" || payment === "easypaisa" || payment === "jazzcash" || payment === "cod") {
    return CHECKOUT_TO_ORDER_PAYMENT[payment];
  }
  return payment;
}

export function PaymentInstructionsCard({
  payment,
  orderNumber,
  totalRupees,
}: PaymentInstructionsCardProps) {
  const settings = useStoreSettings();
  const orderPayment = resolveOrderPayment(payment);
  const copy = buildPaymentInstructions({
    payment: orderPayment,
    orderNumber,
    totalRupees,
    supportPhone: settings.supportPhone,
    paymentDetails: {
      paymentBankName: settings.paymentBankName,
      paymentBankAccountTitle: settings.paymentBankAccountTitle,
      paymentBankAccountNumber: settings.paymentBankAccountNumber,
      paymentBankIban: settings.paymentBankIban,
      paymentEasypaisaAccountTitle: settings.paymentEasypaisaAccountTitle,
      paymentEasypaisaNumber: settings.paymentEasypaisaNumber,
      paymentJazzcashAccountTitle: settings.paymentJazzcashAccountTitle,
      paymentJazzcashNumber: settings.paymentJazzcashNumber,
    },
  });

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--color-ink-100)] bg-[var(--color-warn-50)] px-4 py-3 md:px-5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-warn-800)]">
          Next step
        </p>
        <p className="mt-1 text-[15px] font-semibold text-[var(--color-ink-900)]">{copy.title}</p>
      </div>
      <ol className="list-decimal space-y-2.5 p-4 pl-8 text-[13px] leading-snug text-[var(--color-ink-700)] md:p-5 md:pl-9">
        {copy.steps.map((step) => (
          <li key={step} className="max-w-prose">
            {step}
          </li>
        ))}
      </ol>
      {copy.accountDetails.length > 0 ? (
        <div className="border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-4 md:p-5">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
            Send to
          </p>
          <ul className="space-y-1.5">
            {copy.accountDetails.map((detail) => (
              <CopyableRow key={detail.label} detail={detail} />
            ))}
          </ul>
        </div>
      ) : null}
      <div className="border-t border-[var(--color-ink-100)] p-4 md:p-5">
        <a
          href={buildWhatsAppLink(copy.whatsappPrefill, settings.whatsappNumber)}
          target="_blank"
          rel="noopener noreferrer"
          className="tap inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-whatsapp)] py-2.5 text-[13px] font-semibold text-[var(--color-on-dark)] hover:bg-[var(--color-whatsapp-dark)]"
        >
          <MessageCircle size={15} />
          Message us on WhatsApp
        </a>
      </div>
    </Card>
  );
}

function CopyableRow({ detail }: { detail: PaymentInstructionAccountDetail }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(detail.value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can fail on insecure origins / older browsers — silent
      // fallback because the value is still visible on screen.
    }
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--color-canvas)] px-3 py-2 text-[12.5px]">
      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
          {detail.label}
        </span>
        <span className="mt-0.5 block break-words font-mono text-[12.5px] text-[var(--color-ink-900)]">
          {detail.value}
        </span>
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="tap inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2 py-1 text-[10.5px] font-semibold text-[var(--color-ink-700)] transition-colors hover:border-[var(--color-accent-300)] hover:text-[var(--color-accent-800)]"
        aria-label={`Copy ${detail.label}`}
      >
        {copied ? (
          <>
            <Check size={11} aria-hidden /> Copied
          </>
        ) : (
          <>
            <Copy size={11} aria-hidden /> {detail.copyLabel ?? "Copy"}
          </>
        )}
      </button>
    </li>
  );
}
