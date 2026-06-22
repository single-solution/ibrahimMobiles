"use client";

import { useEffect, useState } from "react";
import type { ActiveOffer } from "@store/shared";

/**
 * Offers power every price line (cart, drawer, PDP), so multiple instances of
 * this hook can mount on one page. A module-level cache + shared in-flight
 * promise collapses them into a single `/api/offers` round-trip, refreshed at
 * most once per `OFFERS_TTL_MS`.
 */
const OFFERS_TTL_MS = 60_000;

let cachedOffers: ActiveOffer[] | null = null;
let cachedAt = 0;
let inflight: Promise<ActiveOffer[]> | null = null;

async function loadOffers(): Promise<ActiveOffer[]> {
	const isFresh = cachedOffers !== null && Date.now() - cachedAt < OFFERS_TTL_MS;
	if (isFresh) {
		return cachedOffers as ActiveOffer[];
	}
	if (inflight) {
		return inflight;
	}
	inflight = (async () => {
		try {
			const res = await fetch("/api/offers");
			if (!res.ok) {
				return cachedOffers ?? [];
			}
			const data = (await res.json()) as ActiveOffer[];
			cachedOffers = data;
			cachedAt = Date.now();
			return data;
		} catch {
			// Offers are non-critical pricing hints; a fetch failure just leaves
			// the cart at list price until the next load.
			return cachedOffers ?? [];
		} finally {
			inflight = null;
		}
	})();
	return inflight;
}

export function useActiveOffers() {
	const [offers, setOffers] = useState<ActiveOffer[]>(cachedOffers ?? []);
	const [isLoading, setIsLoading] = useState(cachedOffers === null);

	useEffect(() => {
		let active = true;
		void loadOffers().then((next) => {
			if (!active) {
				return;
			}
			setOffers(next);
			setIsLoading(false);
		});
		return () => {
			active = false;
		};
	}, []);

	return { offers, isLoading };
}
