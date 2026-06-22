/**
 * PDP OG card.
 *
 * Renders a branded 1200×630 image used by Twitter/X, Facebook,
 * WhatsApp, LinkedIn, etc. when someone shares a product URL.
 *
 * Photo source: `product.images[0].variants.detail` (1080w).
 *
 * Failure mode: if any of the inputs are missing or `ImageResponse`
 * throws, we emit a minimal storefront-branded fallback so the social
 * bot still has something to show.
 */

import { ImageResponse } from "next/og";

import { connectDB, Brand as BrandModel, Category as CategoryModel, Grade as GradeModel } from "@store/db";
import { getDefaultVariant } from "@/lib/productSummary";
import { getSeoSettings } from "@/lib/seo/seoSettings";
import { getProductBySlug } from "@/lib/core/queries";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const revalidate = 86_400;
export const alt = "Product preview";

interface OgPageParams {
	params: Promise<{ category: string; slug: string }>;
}

interface PdpOgData {
	brandName: string;
	productName: string;
	gradeColor: string;
	gradeLabel: string;
	categoryLabel: string;
	priceLabel: string;
	heroDetail: string | undefined;
	siteName: string;
}

async function loadPdpOgData(slug: string): Promise<PdpOgData | null> {
	try {
		await connectDB();
		const product = await getProductBySlug(slug);
		if (!product) return null;
		const variant = getDefaultVariant(product);
		const [brand, category, grade, settings] = await Promise.all([
			BrandModel.findOne({
				slug: product.brandSlug,
				categorySlugs: product.categorySlug,
			}).lean<{ name?: string } | null>(),
			CategoryModel.findOne({ slug: product.categorySlug }).lean<{ label?: string } | null>(),
			GradeModel.findOne({
				categorySlug: product.categorySlug,
				slug: variant.gradeSlug,
			}).lean<{ label?: string; color?: string } | null>(),
			getSeoSettings(),
		]);

		return {
			brandName: brand?.name ?? product.brandName,
			productName: product.name,
			gradeColor: grade?.color ?? "#e1ff51",
			gradeLabel: grade?.label ?? variant.gradeSlug,
			categoryLabel: category?.label ?? "",
			priceLabel: new Intl.NumberFormat("en-PK", {
				style: "currency",
				currency: "PKR",
				maximumFractionDigits: 0,
			}).format(variant.priceRupees),
			heroDetail: product.images[0]?.variants.detail,
			siteName: settings.siteName,
		};
	} catch {
		return null;
	}
}

export default async function ProductOgImage({ params }: OgPageParams) {
	const { slug } = await params;
	const data = await loadPdpOgData(slug);
	if (!data) {
		return notFoundImage();
	}
	return new ImageResponse(<PdpCard {...data} />, size);
}

function PdpCard(data: PdpOgData) {
	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				background: `linear-gradient(135deg, ${data.gradeColor}26 0%, #00272c 70%)`,
				color: "#f8fbf8",
				fontFamily: "system-ui, sans-serif",
				padding: 64,
			}}
		>
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					paddingRight: 48,
				}}
			>
				<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
					<div
						style={{
							display: "flex",
							alignSelf: "flex-start",
							background: "rgba(255,255,255,0.15)",
							borderRadius: 9999,
							padding: "8px 18px",
							fontSize: 22,
							letterSpacing: 1,
							textTransform: "uppercase",
						}}
					>
						{data.brandName}
					</div>
					<div style={{ fontSize: 60, lineHeight: 1.05, fontWeight: 700 }}>{data.productName}</div>
					<div
						style={{
							display: "flex",
							alignSelf: "flex-start",
							background: data.gradeColor,
							borderRadius: 12,
							padding: "8px 18px",
							fontSize: 22,
							fontWeight: 600,
						}}
					>
						{data.categoryLabel ? `${data.gradeLabel}  ·  ${data.categoryLabel}` : data.gradeLabel}
					</div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					<div style={{ fontSize: 56, fontWeight: 800 }}>{data.priceLabel}</div>
					<div style={{ display: "flex", fontSize: 22, opacity: 0.85 }}>{`Free delivery nationwide · ${data.siteName}`}</div>
				</div>
			</div>
			{data.heroDetail ? (
				<div
					style={{
						width: 440,
						height: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<img
						src={data.heroDetail}
						alt={data.productName}
						width={420}
						height={520}
						style={{
							objectFit: "contain",
							borderRadius: 32,
							background: "rgba(255,255,255,0.05)",
						}}
					/>
				</div>
			) : null}
		</div>
	);
}

function notFoundImage() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "#00272c",
				color: "#f8fbf8",
				fontFamily: "system-ui, sans-serif",
				fontSize: 64,
			}}
		>
			ibrahimmobiles
		</div>,
		size,
	);
}
