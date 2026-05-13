import { ButtonLink } from "@/components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-accent-700)]">
        404
      </p>
      <h1 className="font-semibold mt-3 text-5xl leading-[0.95] tracking-tight text-[var(--color-ink-900)] sm:text-6xl">
        We can&apos;t find that page.
      </h1>
      <p className="mt-3 max-w-md text-[var(--color-ink-600)]">
        It may have moved, or the link could be wrong. Head back to the shop and we&apos;ll help
        you find a phone.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <ButtonLink href="/" variant="primary" size="md">
          Go home
        </ButtonLink>
        <ButtonLink href="/shop" variant="outline" size="md">
          Browse phones
        </ButtonLink>
      </div>
    </div>
  );
}
