import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { phones } from "@/data/phones";
import { brands } from "@/data/brands";

interface ProductEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductEditPage({ params }: ProductEditPageProps) {
  const { id } = await params;
  const phone = phones.find((candidate) => candidate.id === id);
  if (!phone) {
    notFound();
  }
  const brand = brands.find((candidate) => candidate.slug === phone.brandSlug);

  return (
    <AdminShell>
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink-500)] transition-colors hover:text-[var(--color-ink-900)]"
      >
        <ChevronLeft size={12} />
        Back to products
      </Link>

      <div className="mt-4">
        <PageTitle
          eyebrow={brand?.name ?? phone.brandSlug}
          title={phone.modelName}
          description={`${phone.variants.length} variants · ${phone.id}`}
        />
      </div>

      <div className="mt-8">
        <ProductEditor phone={phone} brands={brands} />
      </div>
    </AdminShell>
  );
}
