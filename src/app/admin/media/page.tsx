import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { phones } from "@/data/phones";

export default function AdminMediaPage() {
  const mediaEntries = phones.flatMap((phone) =>
    [phone.imageUrl, ...phone.galleryUrls].map((imageUrl, index) => ({
      id: `${phone.id}-${index}`,
      imageUrl,
      brandSlug: phone.brandSlug,
      modelName: phone.modelName,
      altLabel: index === 0 ? "Hero" : `Gallery ${index}`,
    })),
  );

  return (
    <AdminShell>
      <PageTitle eyebrow="Site" title="Media library" />
      <section className="mt-8">
        <MediaLibrary mediaEntries={mediaEntries} />
      </section>
    </AdminShell>
  );
}
