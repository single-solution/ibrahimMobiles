import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Brand } from "@/types";

interface BrandTileProps {
  brand: Brand;
}

const BRAND_LOGO_COLOR: Record<string, string> = {
  apple: "000000",
  samsung: "1428A0",
  google: "4285F4",
  xiaomi: "FF6900",
};

export function BrandTile({ brand }: BrandTileProps) {
  const logoColor = BRAND_LOGO_COLOR[brand.slug];
  const logoUrl = logoColor
    ? `https://cdn.simpleicons.org/${brand.slug}/${logoColor}`
    : null;

  return (
    <Link
      href={`/shop?brand=${brand.slug}`}
      className="group relative flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3 text-center transition-all hover:-translate-y-0.5 hover:border-[var(--color-ink-200)] hover:shadow-[var(--shadow-md)] sm:items-start sm:justify-start sm:gap-5 sm:p-6 sm:text-left"
    >
      <div className="flex w-full items-start justify-between">
        <div className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] sm:size-14">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${brand.name} logo`}
              width={32}
              height={32}
              className="size-6 object-contain sm:size-8"
              unoptimized
            />
          ) : (
            <span className="text-sm font-bold tracking-tight text-[var(--color-ink-900)] sm:text-base">
              {brand.name.charAt(0)}
            </span>
          )}
        </div>
        <ArrowUpRight
          size={14}
          className="hidden text-[var(--color-ink-400)] transition-colors group-hover:text-[var(--color-accent-600)] sm:block sm:size-4"
        />
      </div>
      <div>
        <h3 className="text-[12px] font-semibold leading-tight text-[var(--color-ink-900)] sm:text-base">
          {brand.name}
        </h3>
        <p className="mt-0.5 hidden text-xs font-medium text-[var(--color-accent-700)] sm:mt-1 sm:block">
          {brand.phoneCount} in stock
        </p>
      </div>
    </Link>
  );
}
