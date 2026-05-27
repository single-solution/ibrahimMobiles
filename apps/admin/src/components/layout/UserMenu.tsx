"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, KeyRound, LogOut, User } from "lucide-react";
import { classNames } from "@store/shared";
import type { UserRole } from "@store/db";

import { formatRole, getInitials } from "@/lib/initials";

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  business_manager: "Business manager",
  product_manager: "Product manager",
  marketing_manager: "Marketing manager",
  support_staff: "Support staff",
};

interface UserMenuProps {
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  onLogout: () => void;
}

function roleLabel(role: string, isSuperAdmin: boolean): string {
  if (isSuperAdmin) return "Owner";
  if (role in ROLE_LABEL) {
    return ROLE_LABEL[role as UserRole];
  }
  return formatRole(role);
}

export function UserMenu({
  name,
  email,
  role,
  isSuperAdmin,
  onLogout,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const displayName = name.trim() || "Admin";
  const displayRole = roleLabel(role, isSuperAdmin);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className={classNames(
          "flex min-w-[12.5rem] max-w-[15rem] items-center gap-2 rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] py-1 pl-1 pr-2.5 text-left shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--color-canvas-deep)]",
          open && "ring-2 ring-[var(--color-accent-100)]",
        )}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-accent-500)] text-[10px] font-semibold text-[var(--color-ink-900)]">
          {getInitials(displayName)}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[11px] font-semibold text-[var(--color-ink-900)]">
            {displayName}
          </span>
          <span className="block truncate text-[10px] text-[var(--color-ink-500)]">
            {displayRole}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={classNames(
            "shrink-0 text-[var(--color-ink-400)] transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          /* Concentric: inner full-pill menu rows live behind p-1 gutter
             — pill geometry makes the formula a soft target; --radius-xl
             keeps the popover visually proportional to its dense rows. */
          className="animate-popover-in absolute right-0 top-[calc(100%+6px)] z-50 w-56 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] py-1.5 shadow-[var(--shadow-lg)]"
        >
          <div className="border-b border-[var(--color-ink-100)] px-3 py-2">
            <p className="truncate text-[11px] font-semibold text-[var(--color-ink-900)]">
              {displayName}
            </p>
            <p className="truncate text-[10px] text-[var(--color-ink-500)]">
              {email || "No email"}
            </p>
          </div>

          <div className="p-1">
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-9 items-center gap-2 rounded-[var(--radius-full)] px-2.5 text-[11px] font-medium text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
            >
              <User size={14} className="shrink-0" aria-hidden />
              Profile
            </Link>
            <Link
              href="/account#password"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-9 items-center gap-2 rounded-[var(--radius-full)] px-2.5 text-[11px] font-medium text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
            >
              <KeyRound size={14} className="shrink-0" aria-hidden />
              Password
            </Link>
          </div>

          <div className="border-t border-[var(--color-ink-100)] p-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex h-9 w-full items-center gap-2 rounded-[var(--radius-full)] px-2.5 text-[11px] font-semibold text-[var(--color-danger-700)] transition-colors hover:bg-[var(--color-danger-50)]"
            >
              <LogOut size={14} className="shrink-0" aria-hidden />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
