import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStoreSettings } from "@store/db";
import {
  buildWhatsAppLink,
  classNames,
  formatPrice,
  formatStorefrontDate,
  LOYALTY_EARN_RULES,
  LOYALTY_MAX_REDEEM_PERCENT,
  LOYALTY_PROGRAM_NAME,
} from "@store/shared";
import {
  ArrowUpRight,
  ChevronRight,
  Heart,
  Headset,
  LayoutDashboard,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

import { auth } from "@/lib/auth";
import { getAccountOverview } from "@/lib/storefront/account";

import type {
  StorefrontOrder,
} from "@/lib/storefront/orderSerializer";
import type { OrderStatus } from "@store/db";
import { SignOutButton } from "@/components/account/SignOutButton";

export const metadata: Metadata = {
  title: "Your account",
  description: "Track orders, manage addresses and pick up where you left off.",
};

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<
  OrderStatus,
  { toneBg: string; toneFg: string; toneDot: string; nextLabel?: string }
> = {
  "pending-payment": {
    toneBg: "bg-amber-50",
    toneFg: "text-amber-800",
    toneDot: "bg-amber-500",
    nextLabel: "Awaiting payment",
  },
  confirmed: {
    toneBg: "bg-sky-50",
    toneFg: "text-sky-800",
    toneDot: "bg-sky-500",
    nextLabel: "Packing your order",
  },
  dispatched: {
    toneBg: "bg-[var(--color-accent-100)]",
    toneFg: "text-[var(--color-accent-800)]",
    toneDot: "bg-[var(--color-accent-600)]",
    nextLabel: "Out for delivery",
  },
  delivered: {
    toneBg: "bg-emerald-50",
    toneFg: "text-emerald-800",
    toneDot: "bg-emerald-500",
  },
  cancelled: {
    toneBg: "bg-rose-50",
    toneFg: "text-rose-800",
    toneDot: "bg-rose-500",
  },
  refunded: {
    toneBg: "bg-rose-50",
    toneFg: "text-rose-800",
    toneDot: "bg-rose-500",
  },
};


export default async function AccountPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "customer" || !session.user.customerId) {
    redirect("/account/sign-in?next=/account");
  }

  const overview = await getAccountOverview(session.user.customerId);
  if (!overview) {
    // Customer record was deleted under a still-valid session — sign them out.
    redirect("/account/sign-in?next=/account");
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8">
      <AccountHeader name={overview.customer.name} joinedAt={overview.customer.joinedAt} />

      {overview.loyalty ? (
        <LoyaltyCard loyalty={overview.loyalty} />
      ) : (
        <NotALoyaltyMember />
      )}

      <div className="mt-4 grid gap-4 md:mt-6 md:grid-cols-3 md:gap-4">
        <StatCard
          icon={<Truck size={16} />}
          label="Active orders"
          value={String(overview.activeCount)}
          href="/account/orders"
          accent="amber"
        />
        <StatCard
          icon={<Package size={16} />}
          label="All-time orders"
          value={String(overview.totalCount)}
          href="/account/orders"
          accent="ink"
        />
        <StatCard
          icon={<ShieldCheck size={16} />}
          label="Total spent"
          value={formatPrice(overview.totalSpentRupees)}
          accent="emerald"
        />
      </div>

      <div className="mt-6 grid gap-6 md:mt-8 md:grid-cols-[1fr_320px] md:gap-6 lg:gap-8">
        <div className="space-y-4">
          <SectionHeader
            eyebrow="Recent orders"
            title="What you&rsquo;ve been buying"
            ctaHref="/account/orders"
            ctaLabel="See all orders"
          />
          {overview.recentOrders.length === 0 ? (
            <EmptyOrders />
          ) : (
            <ul className="space-y-3">
              {overview.recentOrders.map((order) => (
                <li key={order.id}>
                  <RecentOrderRow order={order} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-4 md:sticky md:top-[calc(var(--desktop-header-h)+24px)] md:self-start">
          <ProfileCard customer={overview.customer} />
          <QuickActions />
          <SupportCard />
        </aside>
      </div>
    </div>
  );
}

function AccountHeader({ name, joinedAt }: { name: string; joinedAt: string }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
          Salam, {name.split(" ")[0]}
        </p>
        <h1 className="mt-1 font-headline text-[36px] font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)] md:text-[52px]">
          Welcome back.
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-ink-500)] md:text-sm">
          Track orders, manage addresses and pick up where you left off.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full bg-[var(--color-accent-50)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-accent-800)] md:inline-flex">
          <LayoutDashboard size={13} />
          Customer · Member since {new Date(joinedAt).getFullYear()}
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}

function LoyaltyCard({ loyalty }: { loyalty: { balance: number; lifetimeEarned: number; pendingFromShipping: number } }) {
  const { balance, lifetimeEarned, pendingFromShipping } = loyalty;
  return (
    <div className="mt-5 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-accent-200)] bg-gradient-to-br from-[var(--color-accent-100)] via-[var(--color-accent-50)] to-[var(--color-canvas)] shadow-[var(--shadow-sm)] md:mt-8">
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_1px_1.1fr] md:gap-7 md:p-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
              <Sparkles size={15} strokeWidth={2.4} />
            </span>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-800)]">
              {LOYALTY_PROGRAM_NAME}
            </p>
          </div>
          <div>
            <p className="font-headline text-[44px] font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)] md:text-[60px]">
              {balance.toLocaleString("en-PK")}
            </p>
            <p className="mt-1 text-[12px] font-medium text-[var(--color-accent-800)]">
              {LOYALTY_PROGRAM_NAME.toLowerCase()} available · worth{" "}
              <span className="font-semibold text-[var(--color-ink-900)]">
                {formatPrice(balance)}
              </span>{" "}
              off
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[var(--color-ink-700)]">
            <span>
              <span className="font-semibold text-[var(--color-ink-900)]">
                {lifetimeEarned.toLocaleString("en-PK")}
              </span>{" "}
              lifetime earned
            </span>
            {pendingFromShipping > 0 && (
              <span>
                <span className="font-semibold text-[var(--color-ink-900)]">
                  {pendingFromShipping.toLocaleString("en-PK")}
                </span>{" "}
                pending until delivery
              </span>
            )}
          </div>
          <ButtonLink
            href="/checkout"
            variant="primary"
            size="sm"
            className="cta-arrow w-fit"
            trailingIcon={<ArrowUpRight size={13} strokeWidth={2.4} />}
          >
            Use at checkout
          </ButtonLink>
        </div>

        <div className="hidden bg-[var(--color-accent-200)]/60 md:block" aria-hidden />

        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-600)]">
            Ways to earn more
          </p>
          <ul className="mt-3 space-y-2">
            {LOYALTY_EARN_RULES.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]/85 p-3"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
                  <Star size={13} strokeWidth={2.4} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-[var(--color-ink-900)]">
                    {rule.label}
                  </p>
                  <p className="text-[11px] leading-snug text-[var(--color-ink-500)]">
                    {rule.description}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--color-accent-50)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--color-accent-800)]">
                  {rule.reward}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-[var(--color-ink-500)]">
            Pay up to{" "}
            <span className="font-semibold text-[var(--color-ink-900)]">
              {LOYALTY_MAX_REDEEM_PERCENT}%
            </span>{" "}
            of any order with points. 1 point = Rs 1 off.
          </p>
        </div>
      </div>
    </div>
  );
}

function NotALoyaltyMember() {
  return (
    <Card className="mt-5 flex items-center gap-3 p-4 md:mt-8 md:p-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
        <Sparkles size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-[var(--color-ink-900)]">
          Join {LOYALTY_PROGRAM_NAME}
        </p>
        <p className="text-[12px] text-[var(--color-ink-500)]">
          Earn points on every order — ask us at checkout to enrol.
        </p>
      </div>
    </Card>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  accent: "amber" | "ink" | "emerald";
}

function StatCard({ icon, label, value, href, accent }: StatCardProps) {
  const accentClasses: Record<StatCardProps["accent"], string> = {
    amber: "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]",
    ink: "bg-[var(--color-ink-100)] text-[var(--color-ink-700)]",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  const Wrapper: React.ElementType = href ? Link : "div";
  const props = href ? { href } : {};
  return (
    <Wrapper
      {...props}
      className="lift block rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] md:p-5"
    >
      <div className="flex items-center justify-between">
        <span
          className={classNames(
            "grid size-8 place-items-center rounded-[var(--radius-md)]",
            accentClasses[accent],
          )}
        >
          {icon}
        </span>
        {href && <ChevronRight size={14} className="text-[var(--color-ink-400)]" />}
      </div>
      <p className="mt-3 text-[20px] font-semibold tracking-tight text-[var(--color-ink-900)] md:text-[24px]">
        {value}
      </p>
      <p className="mt-0.5 text-[12px] font-medium text-[var(--color-ink-500)]">{label}</p>
    </Wrapper>
  );
}

interface RecentOrderRowProps {
  order: StorefrontOrder;
}

function RecentOrderRow({ order }: RecentOrderRowProps) {
  const tone = STATUS_TONE[order.status];
  const firstItem = order.items[0];
  const extraCount = Math.max(0, order.items.length - 1);
  return (
    <Link
      href={`/account/orders/${order.orderNumber}`}
      className="lift group block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-4 py-2.5 md:px-5">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="font-mono font-semibold text-[var(--color-ink-900)]">
            {order.orderNumber}
          </span>
          <span className="text-[var(--color-ink-400)]">·</span>
          <span className="text-[var(--color-ink-500)]">{formatStorefrontDate(order.placedAt)}</span>
        </div>
        <span
          className={classNames(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            tone.toneBg,
            tone.toneFg,
          )}
        >
          <span className={classNames("size-1.5 rounded-full", tone.toneDot)} />
          {order.statusLabel}
        </span>
      </div>
      <div className="flex items-center gap-3 p-3 md:p-4">
        <div className="min-w-0 flex-1">
          {firstItem && (
            <p className="line-clamp-1 text-[14px] font-semibold text-[var(--color-ink-900)]">
              {firstItem.productName}
              {extraCount > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-[var(--color-ink-100)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--color-ink-700)]">
                  +{extraCount} more
                </span>
              )}
            </p>
          )}
          <p className="mt-0.5 text-[12px] text-[var(--color-ink-500)]">
            {tone.nextLabel ?? "View order details"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-semibold tracking-tight text-[var(--color-ink-900)]">
            {formatPrice(order.totals.totalRupees)}
          </p>
          <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-ink-400)]">
            {order.totals.itemCount} item{order.totals.itemCount === 1 ? "" : "s"}
          </p>
        </div>
        <ArrowUpRight
          size={15}
          className="hidden text-[var(--color-ink-400)] transition-colors group-hover:text-[var(--color-accent-700)] md:block"
        />
      </div>
    </Link>
  );
}

function EmptyOrders() {
  return (
    <Card className="flex flex-col items-center gap-4 p-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[var(--color-ink-500)]">
        <Package size={20} />
      </span>
      <div>
        <p className="text-[15px] font-semibold text-[var(--color-ink-900)]">No orders yet</p>
        <p className="mt-1 text-[13px] text-[var(--color-ink-500)]">
          Browse the shop and your first order will land here.
        </p>
      </div>
      <ButtonLink
        href="/shop"
        variant="primary"
        size="sm"
        className="cta-arrow"
        trailingIcon={<ArrowUpRight size={14} strokeWidth={2.4} />}
      >
        Browse phones
      </ButtonLink>
    </Card>
  );
}

interface ProfileCardProps {
  customer: {
    name: string;
    email: string;
    phoneNumber: string;
    addresses: { recipientName: string; phoneNumber: string; city: string; area?: string; street?: string; isDefault: boolean }[];
  };
}

function ProfileCard({ customer }: ProfileCardProps) {
  const defaultAddress =
    customer.addresses.find((address) => address.isDefault) ?? customer.addresses[0];
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 p-4 md:p-5">
        <span className="grid size-10 place-items-center rounded-full bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
          <User size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[14px] font-semibold text-[var(--color-ink-900)]">
            {customer.name}
          </p>
          <p className="line-clamp-1 text-[12px] text-[var(--color-ink-500)]">
            {customer.email || customer.phoneNumber}
          </p>
        </div>
      </div>
      {defaultAddress ? (
        <div className="border-b border-[var(--color-ink-100)] p-4 md:p-5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
            Default address
          </p>
          <div className="mt-2 flex items-start gap-2">
            <MapPin size={13} className="mt-0.5 shrink-0 text-[var(--color-ink-400)]" />
            <p className="text-[12.5px] leading-snug text-[var(--color-ink-700)]">
              {[defaultAddress.street, defaultAddress.area].filter(Boolean).join(", ") ||
                defaultAddress.recipientName}
              <br />
              {defaultAddress.city} · {defaultAddress.phoneNumber}
            </p>
          </div>
        </div>
      ) : (
        <div className="border-b border-[var(--color-ink-100)] p-4 text-[12.5px] text-[var(--color-ink-500)] md:p-5">
          No saved addresses yet — we&rsquo;ll save the address from your next order.
        </div>
      )}
      <div className="p-3 md:p-4">
        <Link
          href="/account/profile"
          className="cta-arrow tap inline-flex w-full items-center justify-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] py-2 text-[12.5px] font-semibold text-[var(--color-ink-800)] hover:border-[var(--color-ink-300)]"
        >
          Edit profile
          <ChevronRight size={13} />
        </Link>
      </div>
    </Card>
  );
}

const QUICK_ACTIONS = [
  { href: "/wishlist", icon: Heart, label: "Saved phones", subtitle: "Move favourites to cart" },
  { href: "/checkout", icon: Package, label: "Continue checkout", subtitle: "Pick up where you left off" },
  { href: "/track", icon: Truck, label: "Track an order", subtitle: "Public order lookup" },
];

function QuickActions() {
  return (
    <Card className="overflow-hidden">
      <p className="border-b border-[var(--color-ink-100)] px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)] md:px-5">
        Quick actions
      </p>
      <ul className="divide-y divide-[var(--color-ink-100)]">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.href}>
              <Link
                href={action.href}
                className="tap flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-canvas-deep)] md:px-5"
              >
                <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] text-[var(--color-ink-700)]">
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[var(--color-ink-900)]">
                    {action.label}
                  </p>
                  <p className="text-[11.5px] text-[var(--color-ink-500)]">{action.subtitle}</p>
                </div>
                <ChevronRight size={14} className="text-[var(--color-ink-400)]" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

async function SupportCard() {
  const { supportPhone, whatsappNumber } = await getStoreSettings();
  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
          <Headset size={14} />
        </span>
        <p className="text-[13px] font-semibold text-[var(--color-ink-900)]">Need a hand?</p>
      </div>
      <p className="mt-2 text-[12.5px] text-[var(--color-ink-500)]">
        We reply on WhatsApp within minutes — every working day until 9 PM.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <a
          href={buildWhatsAppLink("Salam! I have a question about my account.", whatsappNumber)}
          target="_blank"
          rel="noopener noreferrer"
          className="tap inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-whatsapp)] py-2 text-[12.5px] font-semibold text-white hover:bg-[var(--color-whatsapp-dark)]"
        >
          WhatsApp
        </a>
        <a
          href={`tel:${supportPhone.replace(/\s+/g, "")}`}
          aria-label="Call support"
          className="tap inline-flex size-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:border-[var(--color-ink-300)]"
        >
          <Phone size={14} />
        </a>
      </div>
    </Card>
  );
}

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  ctaHref?: string;
  ctaLabel?: string;
}

function SectionHeader({ eyebrow, title, ctaHref, ctaLabel }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-[18px] font-semibold text-[var(--color-ink-900)] md:text-[22px]">
          {title}
        </h2>
      </div>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="cta-arrow inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-[var(--color-accent-700)] hover:text-[var(--color-accent-800)]"
        >
          {ctaLabel}
          <ArrowUpRight size={13} />
        </Link>
      )}
    </div>
  );
}
