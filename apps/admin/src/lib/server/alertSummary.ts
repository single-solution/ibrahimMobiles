import { connectDB, Inquiry, Order, Product } from "@store/db";

import { LOW_STOCK_VARIANT_THRESHOLD } from "@/lib/server/dashboardStats";

export interface AlertSummary {
  unreadInquiries: number;
  pendingPayments: number;
  lowStockVariants: number;
  openInquiries: number;
}

export async function loadAlertSummary(): Promise<AlertSummary> {
  await connectDB();

  const [unreadInquiries, pendingPayments, productAgg, openInquiries] =
    await Promise.all([
      Inquiry.countDocuments({ unreadByTeam: { $gt: 0 } }),
      Order.countDocuments({ status: "pending-payment" }),
      Product.aggregate<{ _id: null; lowStockVariants: number }>([
        { $match: { isArchived: { $ne: true } } },
        {
          $project: {
            variantsActive: {
              $filter: {
                input: "$variants",
                as: "variant",
                cond: { $ne: ["$$variant.isArchived", true] },
              },
            },
          },
        },
        {
          $project: {
            lowStock: {
              $size: {
                $filter: {
                  input: "$variantsActive",
                  as: "variant",
                  cond: {
                    $and: [
                      { $eq: ["$$variant.isInStock", true] },
                      {
                        $lte: [
                          { $ifNull: ["$$variant.stockCount", 0] },
                          LOW_STOCK_VARIANT_THRESHOLD,
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            lowStockVariants: { $sum: "$lowStock" },
          },
        },
      ]),
      Inquiry.countDocuments({
        status: { $in: ["open", "awaiting-customer"] },
      }),
    ]);

  return {
    unreadInquiries,
    pendingPayments,
    lowStockVariants: productAgg[0]?.lowStockVariants ?? 0,
    openInquiries,
  };
}
