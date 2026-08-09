import { Suspense, type ReactNode } from "react";

import { ShopBannerPersist } from "@/app/_components/shop/ShopBannerPersist";
import { ShopIntroHero } from "@/app/_components/shop/ShopIntroHero";
import { ShopIntroHeroFallback } from "@/components/shared/ShopListingSkeleton";
import { VideoRibbonGallery } from "@/components/shared/VideoRibbonGallery";

export default function ShopCategoryLayout({ children }: { children: ReactNode }) {
	return (
		<>
			<ShopBannerPersist>
				<Suspense fallback={<ShopIntroHeroFallback />}>
					<ShopIntroHero />
				</Suspense>
				<VideoRibbonGallery />
			</ShopBannerPersist>
			{children}
		</>
	);
}
