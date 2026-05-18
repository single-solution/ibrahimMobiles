"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  Package,
  Sparkles,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LOYALTY_PROGRAM_NAME, formatPoints } from "@store/shared";

interface CheckoutSuccessViewProps {
  orderNumber: string;
  pointsEarned: number;
  pointsRedeemed: number;
}

export function CheckoutSuccessView({
  orderNumber,
  pointsEarned,
  pointsRedeemed,
}: CheckoutSuccessViewProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--desktop-header-h)-160px)] max-w-3xl items-center px-4 pb-16 pt-8 md:px-6">
      <div className="w-full">
        <div className="reveal" style={{ ["--reveal-delay" as string]: "60ms" }}>
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-700 md:size-20">
            <CheckCircle2 size={36} strokeWidth={2.2} className="animate-badge-pop" />
          </div>
        </div>
        <div
          className="reveal mt-5 text-center"
          style={{ ["--reveal-delay" as string]: "140ms" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            Order placed
          </p>
          <h1 className="mt-2 font-headline text-[36px] font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)] md:text-[52px]">
            Thank you, your order is in.
          </h1>
          <p className="mt-2 text-[14px] text-[var(--color-ink-600)] md:text-[15px]">
            We&rsquo;ve emailed your confirmation. You&rsquo;ll get a WhatsApp update at every step.
          </p>
        </div>

        <Card
          className="reveal mx-auto mt-6 max-w-xl overflow-hidden md:mt-8"
          style={{ ["--reveal-delay" as string]: "240ms" }}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-4 py-3 md:px-5 md:py-4">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                Order number
              </p>
              <p className="mt-1 font-mono text-[16px] font-semibold tracking-tight text-[var(--color-ink-900)] md:text-[18px]">
                {orderNumber}
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-800)]">
              <Package size={16} />
            </span>
          </div>
          <ul className="space-y-3 p-4 text-[13px] text-[var(--color-ink-700)] md:p-5">
            <li className="flex items-start gap-3">
              <span className="mt-1 size-1.5 rounded-full bg-[var(--color-accent-600)]" />
              <p>
                <strong className="text-[var(--color-ink-900)]">Within 2 hours</strong> — we verify
                your payment and prep the device for final QC.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 size-1.5 rounded-full bg-[var(--color-ink-300)]" />
              <p>
                <strong className="text-[var(--color-ink-900)]">Same day</strong> — we send a video
                of the sealed phone before dispatch.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 size-1.5 rounded-full bg-[var(--color-ink-300)]" />
              <p>
                <strong className="text-[var(--color-ink-900)]">2–4 working days</strong> — Pakistan
                Post delivers door-to-door across Pakistan.
              </p>
            </li>
          </ul>
        </Card>

        {(pointsEarned > 0 || pointsRedeemed > 0) && (
          <Card
            className="reveal mx-auto mt-4 max-w-xl overflow-hidden md:mt-6"
            style={{ ["--reveal-delay" as string]: "320ms" }}
          >
            <div className="flex items-center gap-3 bg-[var(--color-accent-50)] px-4 py-3 md:px-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
                <Sparkles size={16} strokeWidth={2.4} className="animate-badge-pop" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-700)]">
                  {LOYALTY_PROGRAM_NAME}
                </p>
                {pointsEarned > 0 && (
                  <p className="text-[14px] font-semibold text-[var(--color-ink-900)] md:text-[15px]">
                    You earned{" "}
                    <span className="text-[var(--color-accent-800)]">
                      {formatPoints(pointsEarned)}
                    </span>
                    {pointsRedeemed > 0 ? (
                      <>
                        {" "}
                        and used{" "}
                        <span className="text-[var(--color-accent-800)]">
                          {formatPoints(pointsRedeemed)}
                        </span>
                      </>
                    ) : null}
                  </p>
                )}
                {pointsEarned === 0 && pointsRedeemed > 0 && (
                  <p className="text-[14px] font-semibold text-[var(--color-ink-900)] md:text-[15px]">
                    You used{" "}
                    <span className="text-[var(--color-accent-800)]">
                      {formatPoints(pointsRedeemed)}
                    </span>{" "}
                    on this order
                  </p>
                )}
              </div>
              <div className="hidden text-right md:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-700)]">
                  Look up balance
                </p>
                <p className="text-[12px] text-[var(--color-accent-800)]">
                  Anytime via your phone number
                </p>
              </div>
            </div>
          </Card>
        )}

        <div
          className="reveal mt-5 flex flex-col gap-2 md:mt-6 md:flex-row md:justify-center"
          style={{ ["--reveal-delay" as string]: "340ms" }}
        >
          <ButtonLink
            href={`/track?orderNumber=${encodeURIComponent(orderNumber)}`}
            variant="primary"
            size="md"
            className="cta-arrow"
            trailingIcon={<ArrowUpRight size={15} strokeWidth={2.4} />}
          >
            Track this order
          </ButtonLink>
          <ButtonLink href="/shop" variant="outline" size="md">
            Keep shopping
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
