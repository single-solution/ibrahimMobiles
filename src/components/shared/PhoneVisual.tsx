import { classNames } from "@/lib/utils";

interface PhoneVisualProps {
  brandName: string;
  modelName: string;
  colorName: string;
  brandSlug: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const BRAND_GRADIENTS: Record<string, [string, string]> = {
  apple: ["#1f2937", "#0f172a"],
  samsung: ["#1e3a8a", "#0c1c4a"],
  google: ["#0f766e", "#064e3b"],
  xiaomi: ["#ea580c", "#7c2d12"],
  oneplus: ["#dc2626", "#7f1d1d"],
  oppo: ["#0ea5e9", "#075985"],
  vivo: ["#7c3aed", "#3b0764"],
  huawei: ["#475569", "#0f172a"],
};

const FALLBACK_GRADIENT: [string, string] = ["#3f4750", "#0f1418"];

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
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
          </linearGradient>
          <linearGradient id={`bezel-${brandSlug}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
          </linearGradient>
        </defs>
        <rect
          x="20"
          y="10"
          width="160"
          height="260"
          rx="28"
          fill={`url(#bezel-${brandSlug})`}
          stroke="rgba(255,255,255,0.25)"
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
          fill="rgba(0,0,0,0.4)"
        />
        <circle cx="158" cy="50" r="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" />
        <circle cx="158" cy="50" r="4" fill="rgba(0,0,0,0.4)" />
      </svg>

      <div className="absolute inset-x-0 bottom-3 flex flex-col items-center text-center text-white/90 px-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
          {brandName}
        </span>
        <span className="line-clamp-1 text-[13px] font-medium">{modelName}</span>
      </div>

      <div className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-white/10 blur-2xl" />
    </div>
  );
}
