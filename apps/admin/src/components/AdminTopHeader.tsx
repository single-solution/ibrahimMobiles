"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { classNames } from "@store/shared";
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  LogOut,
  ShoppingBag,
} from "lucide-react";

import { formatRole, getInitials } from "@/lib/initials";
import { useStoreSettings } from "@/lib/storeSettingsContext";

interface AdminTopHeaderProps {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

export function AdminTopHeader({ isCollapsed, onToggleCollapsed }: AdminTopHeaderProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { siteName } = useStoreSettings();
  const user = session?.user;
  const brandShort = siteName.split(" ")[0];

  async function handleLogout() {
    await signOut({ redirect: false });
    router.replace("/login");
  }

  return (
    <header className="hidden h-14 shrink-0 items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 shadow-[var(--shadow-sm)] md:flex">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapsed}
          className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
        >
          {isCollapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>
        <Link href="/" className="flex items-center gap-2.5 text-[var(--color-ink-900)]">
          <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
            <ShoppingBag size={14} strokeWidth={2.4} />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
              Admin
            </p>
            <p className="text-sm font-semibold tracking-tight text-[var(--color-ink-900)]">
              {brandShort} HQ
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          className="relative grid size-9 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
        >
          <Bell size={15} />
          <span className="absolute right-1.5 top-1.5 grid size-3.5 place-items-center rounded-full bg-[var(--color-accent-500)] text-[8px] font-bold text-[var(--color-ink-900)]">
            3
          </span>
        </button>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title="View storefront"
          className="hidden h-9 items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 text-xs font-medium text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)] lg:inline-flex"
        >
          <ExternalLink size={13} />
          View storefront
        </Link>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View storefront"
          title="View storefront"
          className="grid size-9 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)] lg:hidden"
        >
          <ExternalLink size={14} />
        </Link>
        <span
          aria-hidden
          className="mx-1 hidden h-6 w-px bg-[var(--color-ink-100)] sm:block"
        />
        <UserPill
          name={user?.name ?? ""}
          role={user?.role ?? "staff"}
          isSuperAdmin={user?.isSuperAdmin === true}
          onLogout={handleLogout}
        />
      </div>
    </header>
  );
}

interface UserPillProps {
  name: string;
  role: string;
  isSuperAdmin: boolean;
  onLogout: () => void;
}

function UserPill({ name, role, isSuperAdmin, onLogout }: UserPillProps) {
  const firstName = name.split(" ")[0] || "Admin";
  const roleLabel = isSuperAdmin ? "Owner" : formatRole(role);

  return (
    <div
      className={classNames(
        "flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] py-1 pl-1 pr-1.5",
      )}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-accent-500)] text-[11px] font-semibold text-[var(--color-ink-900)]">
        {getInitials(name)}
      </span>
      <div className="hidden min-w-0 leading-tight md:block">
        <p className="truncate text-[12px] font-semibold text-[var(--color-ink-900)]">
          {firstName}
        </p>
        <p className="truncate text-[10px] text-[var(--color-ink-500)]">{roleLabel}</p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        aria-label="Log out"
        title="Log out"
        className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-ink-900)]"
      >
        <LogOut size={13} />
      </button>
    </div>
  );
}
