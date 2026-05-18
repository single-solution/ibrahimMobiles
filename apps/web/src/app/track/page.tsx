import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackView } from "@/components/account/TrackView";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the status of any order with your order number and phone.",
};

// No server-side data fetching here — the page is a Suspense shell around
// the client tracker. Letting Next.js cache the static HTML costs nothing
// in freshness and saves a needless render cycle on every visit.
export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackView />
    </Suspense>
  );
}
