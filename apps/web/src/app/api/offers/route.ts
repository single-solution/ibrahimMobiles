import { NextResponse } from "next/server";
import { Offer as OfferModel, connectDB } from "@store/db";
import { isOfferActiveSchedule, toActiveOffer } from "@store/shared";

export async function GET() {
	try {
		await connectDB();

		const docs = await OfferModel.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
		const offers = docs.map((doc) => toActiveOffer(doc));
		const now = new Date();
		const activeOffers = offers.filter((offer) => isOfferActiveSchedule(offer.schedule, now));

		return NextResponse.json(activeOffers);
	} catch {
		return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
	}
}
