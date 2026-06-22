import { DesktopHero } from "@/app/_components/home/homePageDesktopSections";
import { MobileHero } from "@/app/_components/home/homePageMobileSections";
import { shopHrefFromCategories } from "@/lib/catalog/productPaths";
import { getStoreSettingsCached } from "@/lib/core/cached";
import { getHomeHeroData, getShopHeroData, loadHomeCategoryTiles } from "@/lib/core/pageData";
import { getCatalogDealsCached } from "@/lib/core/cached";

interface ShopIntroHeroProps {
	/** When set, flank product names come from every other active category. */
	excludeCategorySlug?: string;
}

/** Reuses the About-page hero as the shared intro banner for /shop routes. */
export async function ShopIntroHero({ excludeCategorySlug }: ShopIntroHeroProps = {}) {
	const [{ heroProducts }, settings, categories, heroDeals] = await Promise.all([
		excludeCategorySlug ? getShopHeroData(excludeCategorySlug) : getHomeHeroData(),
		getStoreSettingsCached(),
		loadHomeCategoryTiles(),
		getCatalogDealsCached(),
	]);
	const shopHref = shopHrefFromCategories(categories);

	return (
		<>
			<div className="md:hidden">
				<MobileHero
					heroProducts={heroProducts}
					settings={settings}
					shopHref={shopHref}
					layout="content"
					showVisitStoreButton={false}
					showWeAreDifferentCue={false}
					heroDeals={heroDeals}
				/>
			</div>
			<div className="hidden md:block">
				<DesktopHero
					heroProducts={heroProducts}
					settings={settings}
					shopHref={shopHref}
					layout="content"
					showVisitStoreButton={false}
					showWeAreDifferentCue={false}
					heroDeals={heroDeals}
				/>
			</div>
		</>
	);
}
