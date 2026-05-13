import Link from "next/link";
import { ShieldCheck, Truck, Undo2 } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";

export function MobileFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-5 py-6 md:hidden">
      <div className="grid grid-cols-3 gap-3 text-center">
        <TrustBadge icon={<Undo2 size={16} />} label="15-day moneyback" />
        <TrustBadge icon={<ShieldCheck size={16} />} label="PTA approved" />
        <TrustBadge icon={<Truck size={16} />} label="Free over 50k" />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-[var(--color-ink-500)]">
        <Link href="/about" className="hover:text-[var(--color-ink-800)]">About</Link>
        <span className="text-[var(--color-ink-300)]">·</span>
        <Link href="/about#how-to-buy" className="hover:text-[var(--color-ink-800)]">How to buy</Link>
        <span className="text-[var(--color-ink-300)]">·</span>
        <Link href="/about#warranty" className="hover:text-[var(--color-ink-800)]">Warranty</Link>
      </div>

      <p className="mt-3 text-center text-[11px] text-[var(--color-ink-400)]">
        © {new Date().getFullYear()} {SITE_NAME} · Hall Road, Lahore
      </p>
    </footer>
  );
}

interface TrustBadgeProps {
  icon: React.ReactNode;
  label: string;
}

function TrustBadge({ icon, label }: TrustBadgeProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="grid size-9 place-items-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
        {icon}
      </span>
      <span className="text-[11px] font-medium leading-tight text-[var(--color-ink-700)]">
        {label}
      </span>
    </div>
  );
}
