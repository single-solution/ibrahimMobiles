import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Saved phones",
  description: "Phones you've saved for later.",
};

export default function WishlistPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
        <Heart size={28} strokeWidth={2} />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--color-ink-900)]">
        Nothing saved yet
      </h1>
      <p className="mt-2 text-sm text-[var(--color-ink-500)]">
        Tap the heart on any phone to keep it here for later. Your saved list stays on your device.
      </p>
      <Link
        href="/shop"
        className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-full)] bg-[var(--color-accent-700)] px-5 py-2.5 text-sm font-semibold text-white active:bg-[var(--color-accent-800)]"
      >
        <Search size={14} />
        Browse phones
      </Link>
    </div>
  );
}
