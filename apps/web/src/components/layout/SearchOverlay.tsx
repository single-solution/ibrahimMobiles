"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, TrendingUp, X } from "lucide-react";
import { classNames, formatPrice, type StoredImage } from "@store/shared";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  slug: string;
  categorySlug: string;
  name: string;
  brandSlug: string;
  brandName: string;
  image: StoredImage | null;
  variantCount: number;
  fromPriceRupees: number;
}

const DEBOUNCE_MS = 220;
const MIN_QUERY_LEN = 2;
const AUTOFOCUS_DELAY_MS = 60;
const SEARCH_RESULTS_LIMIT = 10;
/** Skeleton placeholder rows shown while results load. */
const SKELETON_PLACEHOLDER_ROWS = 4;
/** Static fallback chips shown when the hints endpoint is unreachable
 *  or the catalogue is too sparse to seed any. */
const HINT_FALLBACK: string[] = ["New arrivals", "Best sellers"];

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) {
      // Reset the overlay's transient state when the parent closes us so the
      // next open starts blank. Single command-on-prop-change.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- close-time reset of overlay-local state
      setQuery("");
      setResults([]);
      setHints([]);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, AUTOFOCUS_DELAY_MS);

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

  // Fetch a fresh set of hint chips each time the overlay opens. The
  // server-side mix is randomized, so every open gets a different blend
  // of categories / top sellers / bottom sellers.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const controller = new AbortController();
    fetch("/api/storefront/search/hints", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { hints: [] }))
      .then((data: { hints?: string[] }) => {
        setHints(Array.isArray(data.hints) ? data.hints : []);
      })
      .catch((error) => {
        if (!(error instanceof DOMException) || error.name !== "AbortError") {
          setHints([]);
        }
      });
    return () => controller.abort();
  }, [isOpen]);

  // Debounced fetch against /api/storefront/search.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LEN) {
      // Query too short — clear stale matches so the dropdown doesn't keep
      // showing the previous answer mid-typing.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- input-driven reset
      setResults([]);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/storefront/search?query=${encodeURIComponent(trimmed)}&limit=${SEARCH_RESULTS_LIMIT}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          setResults([]);
          return;
        }
        const data = (await response.json()) as { results: SearchResult[] };
        setResults(data.results ?? []);
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function submitSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onClose();
    // Land on the global shop view with the search query. The shop index
    // page renders results across every active category.
    router.push(`/shop?q=${encodeURIComponent(trimmed)}`);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="animate-sheet-fade fixed inset-0 z-50 flex flex-col bg-[var(--color-canvas)]">
      <div
        className="safe-top sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-2 py-2 md:mx-auto md:w-full md:max-w-5xl md:px-4 md:py-3"
        style={{ "--safe-top-base": "0.5rem" } as CSSProperties}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="grid size-10 place-items-center rounded-full text-[var(--color-ink-700)] active:bg-[var(--color-surface-muted)]"
        >
          <ArrowLeft size={20} />
        </button>
        <form
          className="relative flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch(query);
          }}
        >
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, brands, categories…"
            aria-label="Search products"
            autoComplete="off"
            spellCheck={false}
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
        </form>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:mx-auto md:w-full md:max-w-5xl">
        {query.trim().length < MIN_QUERY_LEN ? (
          <SearchEmptyState
            hints={hints.length > 0 ? hints : HINT_FALLBACK}
            onPick={(value) => submitSearch(value)}
          />
        ) : isLoading && results.length === 0 ? (
          <SearchSkeleton />
        ) : results.length === 0 ? (
          <NoResults query={query.trim()} onSearchAll={() => submitSearch(query)} />
        ) : (
          <ul key={query} className="sheet-stagger space-y-1.5">
            {results.map((result) => (
              <SearchHit key={result.id} result={result} onNavigate={onClose} />
            ))}
            <li className="pt-2">
              <button
                type="button"
                onClick={() => submitSearch(query)}
                className="block w-full rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] px-3 py-2.5 text-center text-[13px] font-semibold text-[var(--color-accent-800)] active:bg-[var(--color-surface-muted)]"
              >
                See all results for &ldquo;{query.trim()}&rdquo;
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}

interface SearchHitProps {
  result: SearchResult;
  onNavigate: () => void;
}

function SearchHit({ result, onNavigate }: SearchHitProps) {
  const href =
    result.categorySlug && result.slug
      ? `/shop/${result.categorySlug}/${result.slug}`
      : "/shop";
  const thumb = result.image?.variants.thumb ?? null;
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-canvas-deep)] px-3 py-3 active:bg-[var(--color-surface-muted)]"
      >
        <span className="product-media-well grid size-12 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-surface)] text-xs font-semibold uppercase text-[var(--color-ink-500)]">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element -- search thumbnail, no need for next/image
            <img
              src={thumb}
              alt=""
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            (result.brandName || result.name).charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
              {result.name}
            </p>
            <span className="shrink-0 rounded-[var(--radius-md)] bg-[var(--color-canvas)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-ink-500)]">
              {result.brandName}
            </span>
          </div>
          <p className="truncate text-xs text-[var(--color-ink-500)]">
            {result.variantCount} option{result.variantCount === 1 ? "" : "s"}
            {result.fromPriceRupees > 0 ? ` · from ${formatPrice(result.fromPriceRupees)}` : ""}
          </p>
        </div>
      </Link>
    </li>
  );
}

interface SearchEmptyStateProps {
  hints: string[];
  onPick: (value: string) => void;
}

function SearchEmptyState({ hints, onPick }: SearchEmptyStateProps) {
  if (hints.length === 0) {
    return null;
  }
  return (
    <div>
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
        <TrendingUp size={12} />
        Try these
      </h3>
      <div className="sheet-stagger mt-3 flex flex-wrap gap-2">
        {hints.map((hint) => (
          <button
            key={hint}
            type="button"
            onClick={() => onPick(hint)}
            className={classNames(
              "tap rounded-[var(--radius-full)] border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] px-3.5 py-2 text-sm font-medium text-[var(--color-ink-700)] active:bg-[var(--color-surface-muted)]",
            )}
          >
            {hint}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <ul aria-busy className="space-y-1.5">
      {Array.from({ length: SKELETON_PLACEHOLDER_ROWS }).map((_, index) => (
        <li
          key={index}
          className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-canvas-deep)] px-3 py-3"
        >
          <span className="size-12 shrink-0 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-muted)]" />
          <div className="flex-1 space-y-1.5">
            <span className="block h-3 w-2/3 animate-pulse rounded bg-[var(--color-surface-muted)]" />
            <span className="block h-2 w-1/3 animate-pulse rounded bg-[var(--color-surface-muted)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

interface NoResultsProps {
  query: string;
  onSearchAll: () => void;
}

function NoResults({ query, onSearchAll }: NoResultsProps) {
  return (
    <div className="mx-auto max-w-xs pt-12 text-center">
      <p className="text-base font-semibold text-[var(--color-ink-800)]">
        No matches for &ldquo;{query}&rdquo;
      </p>
      <p className="mt-1 text-sm text-[var(--color-ink-500)]">
        Try a brand, a model, or a category like &ldquo;accessories&rdquo; or &ldquo;new arrivals&rdquo;.
      </p>
      <button
        type="button"
        onClick={onSearchAll}
        className="mt-4 inline-flex items-center gap-1 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink-800)] hover:border-[var(--color-ink-300)]"
      >
        Search all products →
      </button>
    </div>
  );
}
