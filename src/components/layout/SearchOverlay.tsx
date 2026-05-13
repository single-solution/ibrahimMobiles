"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, TrendingUp, X } from "lucide-react";
import { phones } from "@/data/phones";
import { brands } from "@/data/brands";
import { formatStorage } from "@/lib/utils";
import { classNames } from "@/lib/utils";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRENDING_QUERIES = [
  "iPhone 13",
  "Samsung A54",
  "Pixel 7",
  "Grade A+",
  "Under 50,000",
  "PTA approved",
];

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 60);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, onClose]);

  const matchingPhones = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) {
      return [];
    }
    return phones
      .filter((phone) => {
        const brand = brands.find((candidate) => candidate.slug === phone.brandSlug);
        const haystack = `${brand?.name ?? ""} ${phone.modelName}`.toLowerCase();
        return haystack.includes(trimmed);
      })
      .slice(0, 8);
  }, [query]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-canvas)] md:hidden">
      <div className="safe-top sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-2 py-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="grid size-10 place-items-center rounded-full text-[var(--color-ink-700)] active:bg-[var(--color-surface-muted)]"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search iPhone, Galaxy, Pixel…"
            className="h-11 w-full rounded-[var(--radius-full)] border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] pl-9 pr-10 text-[15px] text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-500)] focus:bg-[var(--color-canvas)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-[var(--color-ink-500)] active:bg-[var(--color-surface-muted)]"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {query.trim().length < 2 ? (
          <SearchEmptyState onPick={(value) => setQuery(value)} />
        ) : matchingPhones.length === 0 ? (
          <NoResults query={query.trim()} />
        ) : (
          <ul className="space-y-1.5">
            {matchingPhones.map((phone) => {
              const brand = brands.find((candidate) => candidate.slug === phone.brandSlug);
              const variant = phone.variants[0];
              return (
                <li key={phone.id}>
                  <Link
                    href={`/shop/${phone.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-canvas-deep)] px-3 py-3 active:bg-[var(--color-surface-muted)]"
                  >
                    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface)] text-xs font-semibold uppercase text-[var(--color-ink-500)]">
                      {brand?.name?.charAt(0) ?? "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
                        {brand?.name} {phone.modelName}
                      </p>
                      <p className="truncate text-xs text-[var(--color-ink-500)]">
                        {phone.variants.length} variant{phone.variants.length === 1 ? "" : "s"}
                        {variant && ` · from ${formatStorage(variant.storageGb)}`}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

interface SearchEmptyStateProps {
  onPick: (value: string) => void;
}

function SearchEmptyState({ onPick }: SearchEmptyStateProps) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
        <TrendingUp size={12} />
        Trending
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {TRENDING_QUERIES.map((trending) => (
          <button
            key={trending}
            type="button"
            onClick={() => onPick(trending)}
            className={classNames(
              "rounded-[var(--radius-full)] border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] px-3.5 py-2 text-sm font-medium text-[var(--color-ink-700)] active:bg-[var(--color-surface-muted)]",
            )}
          >
            {trending}
          </button>
        ))}
      </div>
    </div>
  );
}

interface NoResultsProps {
  query: string;
}

function NoResults({ query }: NoResultsProps) {
  return (
    <div className="mx-auto max-w-xs pt-12 text-center">
      <p className="text-base font-semibold text-[var(--color-ink-800)]">
        No phones for &ldquo;{query}&rdquo;
      </p>
      <p className="mt-1 text-sm text-[var(--color-ink-500)]">
        Try a brand or model — like &ldquo;iPhone 13&rdquo; or &ldquo;Galaxy A54&rdquo;.
      </p>
    </div>
  );
}
