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
      className="group relative flex h-full flex-col gap-5 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--color-ink-200)] hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start justify-between">
        <div className="grid size-14 place-items-center rounded-[var(--radius-md)] bg-[var(--color-surface-muted)]">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${brand.name} logo`}
              width={32}
              height={32}
              className="size-8 object-contain"
              unoptimized
            />
          ) : (
            <span className="text-base font-bold tracking-tight text-[var(--color-ink-900)]">
              {brand.name.charAt(0)}
            </span>
          )}
        </div>
        <ArrowUpRight
          size={16}
          className="text-[var(--color-ink-400)] transition-colors group-hover:text-[var(--color-accent-600)]"
        />
      </div>
      <div>
        <h3 className="text-base font-semibold text-[var(--color-ink-900)]">{brand.name}</h3>
        <p className="mt-1 text-xs font-medium text-[var(--color-accent-700)]">
          {brand.phoneCount} in stock
        </p>
      </div>
    </Link>
  );
}
