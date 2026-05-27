import { classNames } from "@store/shared";

interface ProductVisualProps {
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

/**
 * Generic image-missing fallback for a product card or PDP hero.
 *
 * Renders a brand-tinted gradient surface with the brand + model name
 * centered on it. Brand-agnostic by design — no product-shaped SVG.
 */
export function ProductVisual({
  brandName,
  modelName,
  colorName,
  brandSlug,
  className,
  size = "md",
}: ProductVisualProps) {
  const [gradientFrom, gradientTo] = BRAND_GRADIENTS[brandSlug] ?? FALLBACK_GRADIENT;

  return (
    <div
      className={classNames(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className,
      )}
      style={{
        background: `radial-gradient(circle at 30% 20%, ${gradientFrom}, ${gradientTo})`,
      }}
      role="img"
      aria-label={colorName ? `${brandName} ${modelName} in ${colorName}` : `${brandName} ${modelName}`}
    >
      <div className="relative z-10 flex flex-col items-center gap-1 px-4 text-center text-white/90">
        <span
          className={classNames(
            "font-semibold uppercase tracking-[0.18em] text-white/70",
            size === "sm" && "text-[9px]",
            size === "md" && "text-[10px]",
            size === "lg" && "text-[11px]",
          )}
        >
          {brandName}
        </span>
        <span
          className={classNames(
            "line-clamp-2 font-medium leading-tight",
            size === "sm" && "text-[12px]",
            size === "md" && "text-[14px]",
            size === "lg" && "text-[16px]",
          )}
        >
          {modelName}
        </span>
      </div>

      <div className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-16 size-40 rounded-full bg-white/5 blur-3xl" />
    </div>
  );
}
