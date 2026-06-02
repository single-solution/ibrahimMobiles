"use client";

import { useEffect, useState } from "react";
import type { ActiveOffer } from "@store/shared";

export function useActiveOffers() {
  const [offers, setOffers] = useState<ActiveOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOffers() {
      try {
        const res = await fetch("/api/storefront/offers");
        if (res.ok) {
          const data = await res.json();
          setOffers(data);
        }
      } catch (e) {
        console.error("Failed to fetch active offers", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOffers();
  }, []);

  return { offers, isLoading };
}
