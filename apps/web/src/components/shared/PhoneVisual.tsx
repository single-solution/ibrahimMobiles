import { classNames } from "@store/shared";

interface PhoneVisualProps {
  brandName: string;
  modelName: string;
  colorName: string;
  brandSlug: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/* Brand gradients are restricted to the palette (ink + accent ramps)
   so the phone mockup stays inside the brand colour system. Each brand
   gets its own pair of palette stops to keep visual variety, but the
   palette is the only source of truth. */
const BRAND_GRADIENTS: Record<string, [string, string]> = {
  apple: ["var(--color-ink-800)", "var(--color-ink-900)"],
  samsung: ["var(--color-ink-700)", "var(--color-ink-900)"],
  google: ["var(--color-accent-800)", "var(--color-ink-900)"],
  xiaomi: ["var(--color-accent-700)", "var(--color-ink-900)"],
  oneplus: ["var(--color-ink-900)", "var(--color-ink-700)"],
  oppo: ["var(--color-ink-600)", "var(--color-ink-900)"],
  vivo: ["var(--color-ink-700)", "var(--color-accent-800)"],
  huawei: ["var(--color-ink-800)", "var(--color-ink-900)"],
};

const FALLBACK_GRADIENT: [string, string] = [
  "var(--color-ink-600)",
  "var(--color-ink-900)",
];

export function PhoneVisual({
  brandName,
  modelName,
  colorName,
  brandSlug,
  className,
  size = "md",
}: PhoneVisualProps) {
  const [gradientFrom, gradientTo] = BRAND_GRADIENTS[brandSlug] ?? FALLBACK_GRADIENT;

  return (
    <div
      className={classNames(
        "relative h-full w-full overflow-hidden",
        className,
      )}
      style={{
        background: `radial-gradient(circle at 30% 20%, ${gradientFrom}, ${gradientTo})`,
      }}
      role="img"
      aria-label={`${brandName} ${modelName} in ${colorName}`}
    >
      <svg
        viewBox="0 0 200 280"
        xmlns="http://www.w3.org/2000/svg"
        className={classNames(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[58%]",
          size === "sm" && "h-[68%]",
          size === "md" && "h-[72%]",
          size === "lg" && "h-[76%]",
        )}
        aria-hidden
      >
        <defs>
          <linearGradient id={`screen-${brandSlug}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-on-dark-20)" />
            <stop offset="100%" stopColor="var(--color-on-dark-05)" />
          </linearGradient>
          <linearGradient id={`bezel-${brandSlug}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-on-dark-25)" />
            <stop offset="100%" stopColor="var(--color-on-dark-06)" />
          </linearGradient>
        </defs>
        <rect
          x="20"
          y="10"
          width="160"
          height="260"
          rx="28"
          fill={`url(#bezel-${brandSlug})`}
          stroke="var(--color-on-dark-25)"
          strokeWidth="1.2"
        />
        <rect
          x="28"
          y="20"
          width="144"
          height="240"
          rx="22"
          fill={`url(#screen-${brandSlug})`}
        />
        <rect
          x="84"
          y="26"
          width="32"
          height="6"
          rx="3"
          fill="color-mix(in srgb, var(--color-ink-900) 40%, transparent)"
        />
        <circle
          cx="158"
          cy="50"
          r="10"
          fill="var(--color-on-dark-10)"
          stroke="var(--color-on-dark-20)"
        />
        <circle
          cx="158"
          cy="50"
          r="4"
          fill="color-mix(in srgb, var(--color-ink-900) 40%, transparent)"
        />
      </svg>

      <div className="absolute inset-x-0 bottom-3 flex flex-col items-center px-4 text-center text-[var(--color-on-dark-strong)]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-on-dark-soft)]">
          {brandName}
        </span>
        <span className="line-clamp-1 text-[13px] font-medium">{modelName}</span>
      </div>

      <div className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-[var(--color-on-dark-10)] blur-2xl" />
    </div>
  );
}
