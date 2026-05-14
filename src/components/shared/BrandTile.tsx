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
      className="group relative flex h-full flex-col items-center justify-center gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-2.5 text-center transition-all hover:border-[var(--color-ink-200)] hover:shadow-[var(--shadow-md)] md:items-start md:justify-start md:gap-5 md:p-6 md:text-left"
    >
      <div className="flex w-full items-start justify-between">
        <div className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] md:size-14">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${brand.name} logo`}
              width={32}
              height={32}
              className="size-5 object-contain md:size-8"
              unoptimized
            />
          ) : (
            <span className="text-sm font-bold tracking-tight text-[var(--color-ink-900)] md:text-base">
              {brand.name.charAt(0)}
            </span>
          )}
        </div>
        <ArrowUpRight
          size={14}
          className="hidden text-[var(--color-ink-400)] transition-colors group-hover:text-[var(--color-accent-600)] md:block md:size-4"
        />
      </div>
      <div>
        <h3 className="text-[13px] font-semibold leading-tight text-[var(--color-ink-900)] md:text-base">
          {brand.name}
        </h3>
        <p className="mt-0.5 text-[11px] font-medium text-[var(--color-accent-700)] md:mt-1 md:text-xs">
          {brand.phoneCount} in stock
        </p>
      </div>
    </Link>
  );
}
