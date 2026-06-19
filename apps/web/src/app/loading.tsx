import { ShopCategoryPageLoading } from "@/components/shared/ShopListingSkeleton";

/** Root catalog entry — shown while `/` resolves or redirects to the active category. */
export default function RootLoading() {
	return <ShopCategoryPageLoading includeHero />;
}
