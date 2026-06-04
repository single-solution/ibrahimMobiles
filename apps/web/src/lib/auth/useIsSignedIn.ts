"use client";

import { useEffect, useState } from "react";

/** Shared across mounts so navigating doesn't refetch the session each time. */
let cachedSignedIn: boolean | null = null;

async function fetchSignedIn(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/session", {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return false;
    }
    const data = (await response.json()) as { user?: unknown } | null;
    return Boolean(data?.user);
  } catch {
    return false;
  }
}

/**
 * Client-only signed-in flag for storefront chrome (header account link).
 * Returns `null` until the first check resolves so the server / initial render
 * stays neutral and there's no hydration mismatch. Refreshes on tab focus to
 * pick up sign-in / sign-out that happened elsewhere.
 */
export function useIsSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(cachedSignedIn);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void fetchSignedIn().then((value) => {
        cachedSignedIn = value;
        if (active) {
          setSignedIn(value);
        }
      });
    };
    if (cachedSignedIn === null) {
      refresh();
    }
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return signedIn;
}
