"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <button
      type="button"
      disabled={isSigningOut}
      onClick={async () => {
        setIsSigningOut(true);
        await signOut({ callbackUrl: "/" });
      }}
      className="tap inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-[12.5px] font-semibold text-[var(--color-ink-700)] hover:border-[var(--color-ink-300)] disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Sign out"
    >
      {isSigningOut ? (
        <span className="block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : (
        <LogOut size={13} />
      )}
      {isSigningOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
