"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="tap inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-[12.5px] font-semibold text-[var(--color-ink-700)] hover:border-[var(--color-ink-300)]"
      aria-label="Sign out"
    >
      <LogOut size={13} />
      Sign out
    </button>
  );
}
