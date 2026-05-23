"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Bell, ChevronsLeft, ChevronsRight, ShoppingBag } from "lucide-react";

import { UserMenu } from "@/components/UserMenu";
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
    <header className="hidden h-11 shrink-0 items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 shadow-[var(--shadow-sm)] md:flex">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapsed}
          className="grid size-7 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
        >
          {isCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </button>
        <Link href="/" className="flex items-center gap-2 text-[var(--color-ink-900)]">
          <span className="grid size-7 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
            <ShoppingBag size={13} strokeWidth={2.4} />
          </span>
          <div className="leading-tight">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-700)]">
              Admin
            </p>
            <p className="text-xs font-semibold tracking-tight text-[var(--color-ink-900)]">
              {brandShort} HQ
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications, 3 unread"
          title="Notifications"
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-2.5 text-[11px] font-medium text-[var(--color-ink-700)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--color-ink-200)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
        >
          <Bell size={12} strokeWidth={2.2} aria-hidden />
          <span>Notifications</span>
          <span className="rounded-full bg-[var(--color-accent-500)] px-1.5 py-0.5 text-[9px] font-bold leading-none text-[var(--color-ink-900)]">
            3
          </span>
        </button>
        <UserMenu
          name={user?.name ?? ""}
          email={user?.email ?? ""}
          role={user?.role ?? "support_staff"}
          isSuperAdmin={user?.isSuperAdmin === true}
          onLogout={handleLogout}
        />
      </div>
    </header>
  );
}
