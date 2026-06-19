import { Suspense, type ReactNode } from "react";

import { ShopBannerPersist } from "@/app/_components/shop/ShopBannerPersist";
import { ShopIntroHero } from "@/app/_components/shop/ShopIntroHero";
import { ShopIntroHeroFallback } from "@/components/shared/ShopListingSkeleton";

export default function ShopCategoryLayout({ children }: { children: ReactNode }) {
	return (
		<>
			<ShopBannerPersist>
				<Suspense fallback={<ShopIntroHeroFallback />}>
					<ShopIntroHero />
				</Suspense>
			</ShopBannerPersist>
			{children}
		</>
	);
}
