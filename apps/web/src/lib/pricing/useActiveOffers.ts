"use client";

import { useEffect, useState } from "react";
import type { ActiveOffer } from "@store/shared";

export function useActiveOffers() {
  const [offers, setOffers] = useState<ActiveOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOffers() {
      try {
        const res = await fetch("/api/offers");
        if (res.ok) {
          const data = await res.json();
          setOffers(data);
        }
      } catch {
        // Offers are non-critical pricing hints; a fetch failure just leaves
        // the cart at list price until the next load.
      } finally {
        setIsLoading(false);
      }
    }
    fetchOffers();
  }, []);

  return { offers, isLoading };
}
