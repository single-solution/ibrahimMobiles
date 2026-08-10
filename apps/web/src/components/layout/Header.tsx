"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "@store/shared";
import { Search, ShoppingBag, User } from "lucide-react";
import { BrandLockup } from "@/components/layout/BrandLockup";
import { CartDropdown } from "@/app/cart/_components/CartDropdown";
import { useCart } from "@/lib/cart/useCart";
import { usePrefetchOnIntent } from "@/lib/navigation/usePrefetchOnIntent";
import { useIsSignedIn } from "@/lib/auth/useIsSignedIn";
import { useStoreSettings } from "@/lib/core/storeSettingsContext";
import { useShopHref } from "@/lib/core/storefrontReferenceContext";

const NAV_LINKS = [
	{ matchBase: "/", label: "Home" },
	{ matchBase: "/deals", label: "Deals" },
	{ matchBase: "/about", label: "About" },
] as const;

function isNavActive(matchBase: string, pathname: string, catalogHomeHref: string): boolean {
	if (matchBase === "/") {
		return pathname === "/" || pathname === catalogHomeHref;
	}
	return pathname === matchBase || pathname.startsWith(`${matchBase}/`);
}

interface HeaderProps {
	onOpenSearch: () => void;
}

export function Header({ onOpenSearch }: HeaderProps) {
	const [isScrolled, setIsScrolled] = useState(false);
	const [isCartOpen, setIsCartOpen] = useState(false);
	const cart = useCart();
	const pathname = usePathname() ?? "/";
	const catalogHomeHref = useShopHref();
	const { siteName, brandLogoLight, brandLogoDark } = useStoreSettings();

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 4);
		};
		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	// Close the cart whenever the visitor navigates. Navigation-driven UI
	// reset; `useEffectEvent` is still experimental in React 19.
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- navigation-driven UI reset
		setIsCartOpen(false);
	}, [pathname]);

	return (
		<header
			data-scrolled={isScrolled ? "true" : "false"}
			/* `.scroll-header` (in globals.css) owns the frosted-glass look:
           real `backdrop-filter` + a near-transparent canvas tint at the
           top of the page so the header dissolves into the hero gradient,
           then a stronger 20px / 160%-saturation blur + ink-100 border +
           soft shadow once content scrolls under it. The `border-b` class
           only carves out the bottom border; the *color* is animated by
           the global stylesheet. */
			className="scroll-header sticky top-0 z-[var(--z-sticky)] hidden border-b md:block"
		>
			<div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
				<BrandLockup href={catalogHomeHref} siteName={siteName} logoUrl={brandLogoLight || brandLogoDark} tone="light" size="md" />

				<nav className="flex items-center gap-1">
					{NAV_LINKS.map((navLink) => {
						const href = navLink.matchBase === "/" ? catalogHomeHref : navLink.matchBase;
						const isActive = isNavActive(navLink.matchBase, pathname, catalogHomeHref);
						return <HeaderNavLink key={navLink.matchBase} href={href} label={navLink.label} isActive={isActive} />;
					})}
				</nav>

				<div className="ml-auto flex items-center gap-2">
					<button
						type="button"
						onClick={onOpenSearch}
						aria-label="Search products"
						className="tap inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--color-ink-200)]/80 bg-[var(--color-surface)]/80 px-3.5 text-xs font-semibold text-[var(--color-ink-900)] shadow-[var(--shadow-xs)] transition-all hover:border-[var(--color-accent-500)] hover:bg-[var(--color-accent-50)]/50 focus-visible:outline-none"
					>
						<Search size={14} />
						<span>Search</span>
					</button>
					<HeaderAccountLink isActive={pathname.startsWith("/account")} />
					<button
						type="button"
						onClick={() => setIsCartOpen((previous) => !previous)}
						aria-label="Cart"
						aria-haspopup="dialog"
						aria-expanded={isCartOpen}
						className={classNames(
							"tap relative z-[2] inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-all focus-visible:outline-none",
							isCartOpen
								? "border-[var(--color-accent-500)] bg-[var(--color-accent-500)] text-[var(--color-ink-900)] shadow-[0_0_14px_rgba(225,255,81,0.5)]"
								: "border-[var(--color-ink-200)]/80 bg-[var(--color-surface)]/80 text-[var(--color-ink-900)] shadow-[var(--shadow-xs)] hover:border-[var(--color-accent-500)] hover:bg-[var(--color-accent-50)]/50",
						)}
					>
						<ShoppingBag size={14} />
						<span>Cart</span>
						{cart.itemCount > 0 && (
							<span
								key={cart.itemCount}
								className="animate-badge-pop animate-ping-glow ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-accent-500)] px-1 text-[10px] font-extrabold text-[var(--color-ink-900)] shadow-[var(--shadow-xs)]"
							>
								{cart.itemCount}
							</span>
						)}
					</button>
				</div>
			</div>

			<CartDropdown open={isCartOpen} onClose={() => setIsCartOpen(false)} />
		</header>
	);
}

interface HeaderNavLinkProps {
	href: string;
	label: string;
	isActive: boolean;
}

function HeaderNavLink({ href, label, isActive }: HeaderNavLinkProps) {
	const prefetchHandlers = usePrefetchOnIntent(isActive ? null : href);
	const isDeals = label === "Deals";

	return (
		<Link
			href={href}
			aria-current={isActive ? "page" : undefined}
			onPointerDown={prefetchHandlers.onPointerDown}
			onTouchStart={prefetchHandlers.onTouchStart}
			onFocus={prefetchHandlers.onFocus}
			className={classNames(
				"tap inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all",
				isDeals
					? "animate-interval-bounce border border-[var(--color-accent-500)]/60 bg-[var(--color-accent-500)]/20 font-bold text-[var(--color-ink-900)] shadow-[var(--shadow-xs)] hover:bg-[var(--color-accent-500)]/40"
					: isActive
						? "bg-[var(--color-ink-100)] font-semibold text-[var(--color-ink-900)]"
						: "font-medium text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]",
			)}
		>
			{isDeals && (
				<span className="relative flex size-2">
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-accent-500)] opacity-75"></span>
					<span className="relative inline-flex size-2 rounded-full bg-[var(--color-accent-600)]"></span>
				</span>
			)}
			<span>{label}</span>
		</Link>
	);
}

function HeaderAccountLink({ isActive }: { isActive: boolean }) {
	const signedIn = useIsSignedIn();
	// Until the check resolves (null), keep the neutral "Account" label that
	// matches the server render — only show "Sign in" once we know there's no
	// session, so there's no hydration mismatch.
	const showSignIn = signedIn === false;
	const href = showSignIn ? "/account/sign-in" : "/account";
	const label = showSignIn ? "Sign in" : "Account";
	const prefetchHandlers = usePrefetchOnIntent(href);
	return (
		<Link
			href={href}
			aria-label={label}
			onPointerDown={prefetchHandlers.onPointerDown}
			onTouchStart={prefetchHandlers.onTouchStart}
			onFocus={prefetchHandlers.onFocus}
			className={classNames(
				"tap inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-all focus-visible:outline-none",
				isActive
					? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)] text-[var(--color-ink-900)] shadow-[var(--shadow-sm)]"
					: "border-[var(--color-ink-200)]/80 bg-[var(--color-surface)]/80 text-[var(--color-ink-900)] shadow-[var(--shadow-xs)] hover:border-[var(--color-accent-500)] hover:bg-[var(--color-accent-50)]/50",
			)}
		>
			<User size={14} />
			<span>{label}</span>
		</Link>
	);
}
