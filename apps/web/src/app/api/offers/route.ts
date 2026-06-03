import { NextResponse } from "next/server";
import { Offer as OfferModel, connectDB } from "@store/db";
import { isOfferActiveSchedule } from "@store/shared";

export async function GET() {
  await connectDB();
  
  // We fetch all active offers from the database.
  // The actual evaluation against cart items will happen client-side using OfferEvaluator.
  const docs = await OfferModel.find({ isActive: true }).lean();
  
  const offers = docs.map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    conditions: doc.conditions || [],
    action: doc.action || { type: "percentage_discount", value: 0, target: "cart_total" },
    schedule: doc.schedule || {},
    constraints: doc.constraints || { allowLoyaltyPoints: false, isStackable: false, usageCount: 0 },
    // Derived property from constraints for evaluator compatibility
    allowLoyaltyPoints: doc.constraints?.allowLoyaltyPoints ?? false,
    isStackable: doc.constraints?.isStackable ?? false,
  }));

  const now = new Date();
  const activeOffers = offers.filter(o => isOfferActiveSchedule(o.schedule, now));

  return NextResponse.json(activeOffers);
}
