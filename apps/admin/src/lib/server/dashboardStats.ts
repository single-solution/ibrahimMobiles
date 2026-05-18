
import { ISO_DATE_LENGTH } from "@store/shared";

import { toInquiryResponse, type InquiryLean } from "@/lib/serializers/inquiry";
import type { AdminInquiry } from "@/types/admin";
import {
  connectDB,
  Customer,
  Inquiry,
  LoyaltyAccount,
  Order,
  Product,
} from "@store/db";

interface DashboardKpis {
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  salesTodayRupees: number;
  salesThisWeekRupees: number;
  salesThisMonthRupees: number;
  pendingPayments: number;
  confirmedPayments: number;
  dispatched: number;
  moneyBackClaimsThisMonth: number;
  unitsInStock: number;
  lowStockVariants: number;
  modelsListed: number;
  unitsSoldThisMonth: number;
  openInquiries: number;
  totalCustomers: number;
  loyaltyMembers: number;

  changePercents: {
    ordersToday: number;
    salesToday: number;
    ordersWeek: number;
    salesWeek: number;
    ordersMonth: number;
    salesMonth: number;
    pendingPayments: number;
    confirmedPayments: number;
    dispatched: number;
    units: number;
    lowStock: number;
    inquiries: number;
    customers: number;
    loyalty: number;
  };
}

interface DashboardData {
  kpis: DashboardKpis;
  dailyRevenue: { date: string; rupees: number }[];
  recentInquiries: AdminInquiry[];
}

interface RangeAgg {
  count: number;
  totalRupees: number;
}

interface OrderStatusBucket {
  _id: string;
  count: number;
}

interface DailyRevenueRow {
  _id: string;
  rupees: number;
}

interface RangeRow {
  _id: null;
  count: number;
  totalRupees: number;
}

const PENDING_STATUSES: readonly string[] = ["pending-payment"];
const CONFIRMED_STATUSES: readonly string[] = ["confirmed"];
const DISPATCHED_STATUSES: readonly string[] = ["dispatched"];

/** Width of the rolling daily-revenue series shown on the dashboard. */
const DAILY_SERIES_DAYS = 30;
/** How many of the most recent inquiries to surface in the dashboard sidebar. */
const RECENT_INQUIRIES_LIMIT = 8;
/** Variants with stock at or below this threshold are flagged as "low stock". */
export const LOW_STOCK_VARIANT_THRESHOLD = 2;
/** Days in an ISO week — used when stepping back one full week. */
const DAYS_PER_WEEK = 7;
/** Denominator for percent calculations (always 100). */
const PERCENT_DENOMINATOR = 100;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Number of days to subtract from `getDay()` (Sun=0…Sat=6) to land on Monday. */
const MONDAY_OFFSET = 6;

function startOfWeek(date: Date): Date {
  const next = startOfDay(date);
  const daysSinceMonday = (next.getDay() + MONDAY_OFFSET) % DAYS_PER_WEEK;
  next.setDate(next.getDate() - daysSinceMonday);
  return next;
}

function startOfMonth(date: Date): Date {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}

async function aggregateOrderRange(start: Date, end?: Date): Promise<RangeAgg> {
  const match: Record<string, unknown> = {
    placedAt: end ? { $gte: start, $lt: end } : { $gte: start },
  };
  const rows = await Order.aggregate<RangeRow>([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalRupees: { $sum: "$totals.totalRupees" },
      },
    },
  ]);
  const row = rows[0];
  return {
    count: row?.count ?? 0,
    totalRupees: row?.totalRupees ?? 0,
  };
}

function changePercent(current: number, previous: number): number {
  if (previous <= 0) {
    return current > 0 ? PERCENT_DENOMINATOR : 0;
  }
  const change = ((current - previous) / previous) * PERCENT_DENOMINATOR;
  return Math.round(change);
}

/**
 * KPI-only loader.
 *
 * Runs the ~15 parallel aggregations that produce the KPI numbers — the
 * 4×3 desktop grid and the mobile "today"/"this month" tiles. Split out
 * from the daily-revenue and recent-inquiries reads so each Suspense
 * boundary on the dashboard can light up independently the moment its
 * slice of data lands.
 */
export async function loadDashboardKpis(): Promise<DashboardKpis> {
  await connectDB();
  const now = new Date();

  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const weekStart = startOfWeek(now);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - DAYS_PER_WEEK);

  const monthStart = startOfMonth(now);
  const lastMonthStart = new Date(monthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const [
    todayAgg,
    yesterdayAgg,
    weekAgg,
    lastWeekAgg,
    monthAgg,
    lastMonthAgg,
    statusBuckets,
    moneyBackThisMonth,
    productAgg,
    openInquiries,
    openInquiriesLastWeek,
    customerCount,
    customerCountLastMonth,
    loyaltyCount,
    loyaltyCountLastMonth,
    unitsSoldThisMonthAgg,
  ] = await Promise.all([
    aggregateOrderRange(todayStart),
    aggregateOrderRange(yesterdayStart, todayStart),
    aggregateOrderRange(weekStart),
    aggregateOrderRange(lastWeekStart, weekStart),
    aggregateOrderRange(monthStart),
    aggregateOrderRange(lastMonthStart, monthStart),
    Order.aggregate<OrderStatusBucket>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.countDocuments({ status: "refunded", placedAt: { $gte: monthStart } }),
    Product.aggregate<{
      _id: null;
      modelsListed: number;
      unitsInStock: number;
      lowStockVariants: number;
    }>([
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
          modelCount: { $literal: 1 },
          inStock: {
            $size: {
              $filter: {
                input: "$variantsActive",
                as: "variant",
                cond: { $eq: ["$$variant.isInStock", true] },
              },
            },
          },
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
          modelsListed: { $sum: "$modelCount" },
          unitsInStock: { $sum: "$inStock" },
          lowStockVariants: { $sum: "$lowStock" },
        },
      },
    ]),
    Inquiry.countDocuments({
      status: { $in: ["new", "in-progress", "awaiting-customer"] },
    }),
    Inquiry.countDocuments({
      status: { $in: ["new", "in-progress", "awaiting-customer"] },
      createdAt: { $lt: weekStart },
    }),
    Customer.countDocuments({}),
    Customer.countDocuments({ createdAt: { $lt: monthStart } }),
    LoyaltyAccount.countDocuments({}),
    LoyaltyAccount.countDocuments({ createdAt: { $lt: monthStart } }),
    Order.aggregate<{ _id: null; units: number }>([
      { $match: { placedAt: { $gte: monthStart } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          units: { $sum: "$items.quantity" },
        },
      },
    ]),
  ]);

  const statusMap = new Map<string, number>();
  for (const bucket of statusBuckets) {
    statusMap.set(bucket._id, bucket.count);
  }

  const sumStatuses = (statuses: readonly string[]) =>
    statuses.reduce((total, status) => total + (statusMap.get(status) ?? 0), 0);

  const productStats = productAgg[0] ?? {
    _id: null,
    modelsListed: 0,
    unitsInStock: 0,
    lowStockVariants: 0,
  };

  return {
    ordersToday: todayAgg.count,
    ordersThisWeek: weekAgg.count,
    ordersThisMonth: monthAgg.count,
    salesTodayRupees: todayAgg.totalRupees,
    salesThisWeekRupees: weekAgg.totalRupees,
    salesThisMonthRupees: monthAgg.totalRupees,
    pendingPayments: sumStatuses(PENDING_STATUSES),
    confirmedPayments: sumStatuses(CONFIRMED_STATUSES),
    dispatched: sumStatuses(DISPATCHED_STATUSES),
    moneyBackClaimsThisMonth: moneyBackThisMonth,
    unitsInStock: productStats.unitsInStock,
    lowStockVariants: productStats.lowStockVariants,
    modelsListed: productStats.modelsListed,
    unitsSoldThisMonth: unitsSoldThisMonthAgg[0]?.units ?? 0,
    openInquiries,
    totalCustomers: customerCount,
    loyaltyMembers: loyaltyCount,

    changePercents: {
      ordersToday: changePercent(todayAgg.count, yesterdayAgg.count),
      salesToday: changePercent(todayAgg.totalRupees, yesterdayAgg.totalRupees),
      ordersWeek: changePercent(weekAgg.count, lastWeekAgg.count),
      salesWeek: changePercent(weekAgg.totalRupees, lastWeekAgg.totalRupees),
      ordersMonth: changePercent(monthAgg.count, lastMonthAgg.count),
      salesMonth: changePercent(monthAgg.totalRupees, lastMonthAgg.totalRupees),
      pendingPayments: 0,
      confirmedPayments: 0,
      dispatched: 0,
      units: 0,
      lowStock: 0,
      inquiries: changePercent(openInquiries, openInquiriesLastWeek),
      customers: changePercent(customerCount, customerCountLastMonth),
      loyalty: changePercent(loyaltyCount, loyaltyCountLastMonth),
    },
  };
}

/**
 * Daily revenue series. Single Mongo aggregation — cached and consumed
 * independently of KPIs so the desktop sparklines can show as soon as
 * the trailing 12 days are ready, even if the heavier KPI aggregations
 * are still in flight.
 */
export async function loadDashboardDailyRevenue(): Promise<{ date: string; rupees: number }[]> {
  await connectDB();
  const now = new Date();
  const todayStart = startOfDay(now);
  const dailySeriesStart = new Date(todayStart);
  dailySeriesStart.setDate(dailySeriesStart.getDate() - (DAILY_SERIES_DAYS - 1));

  const dailyRevenueRows = await Order.aggregate<DailyRevenueRow>([
    { $match: { placedAt: { $gte: dailySeriesStart } } },
    {
      $group: {
        _id: {
          $dateToString: { date: "$placedAt", format: "%Y-%m-%d" },
        },
        rupees: { $sum: "$totals.totalRupees" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dailyRevenue: { date: string; rupees: number }[] = [];
  const dailyMap = new Map(dailyRevenueRows.map((row) => [row._id, row.rupees]));
  for (let i = 0; i < DAILY_SERIES_DAYS; i += 1) {
    const date = new Date(dailySeriesStart);
    date.setDate(date.getDate() + i);
    const key = date.toISOString().slice(0, ISO_DATE_LENGTH);
    dailyRevenue.push({ date: key, rupees: dailyMap.get(key) ?? 0 });
  }
  return dailyRevenue;
}

/**
 * Recent inquiries — single indexed lookup, lightest of the three
 * dashboard reads. Cached and consumed on its own so the mobile
 * "Recent inquiries" list can render the instant the rows land.
 */
export async function loadDashboardRecentInquiries(): Promise<AdminInquiry[]> {
  await connectDB();
  const docs = await Inquiry.find()
    .sort({ createdAt: -1 })
    .limit(RECENT_INQUIRIES_LIMIT)
    .lean<InquiryLean[]>();
  return docs.map(toInquiryResponse);
}

export async function loadDashboardData(): Promise<DashboardData> {
  await connectDB();
  const now = new Date();

  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const weekStart = startOfWeek(now);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - DAYS_PER_WEEK);

  const monthStart = startOfMonth(now);
  const lastMonthStart = new Date(monthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const dailySeriesStart = new Date(todayStart);
  dailySeriesStart.setDate(dailySeriesStart.getDate() - (DAILY_SERIES_DAYS - 1));

  const [
    todayAgg,
    yesterdayAgg,
    weekAgg,
    lastWeekAgg,
    monthAgg,
    lastMonthAgg,
    statusBuckets,
    moneyBackThisMonth,
    productAgg,
    openInquiries,
    openInquiriesLastWeek,
    customerCount,
    customerCountLastMonth,
    loyaltyCount,
    loyaltyCountLastMonth,
    unitsSoldThisMonthAgg,
    dailyRevenueRows,
    recentInquiryDocs,
  ] = await Promise.all([
    aggregateOrderRange(todayStart),
    aggregateOrderRange(yesterdayStart, todayStart),
    aggregateOrderRange(weekStart),
    aggregateOrderRange(lastWeekStart, weekStart),
    aggregateOrderRange(monthStart),
    aggregateOrderRange(lastMonthStart, monthStart),
    Order.aggregate<OrderStatusBucket>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.countDocuments({ status: "refunded", placedAt: { $gte: monthStart } }),
    Product.aggregate<{
      _id: null;
      modelsListed: number;
      unitsInStock: number;
      lowStockVariants: number;
    }>([
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
          modelCount: { $literal: 1 },
          inStock: {
            $size: {
              $filter: {
                input: "$variantsActive",
                as: "variant",
                cond: { $eq: ["$$variant.isInStock", true] },
              },
            },
          },
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
          modelsListed: { $sum: "$modelCount" },
          unitsInStock: { $sum: "$inStock" },
          lowStockVariants: { $sum: "$lowStock" },
        },
      },
    ]),
    Inquiry.countDocuments({
      status: { $in: ["new", "in-progress", "awaiting-customer"] },
    }),
    Inquiry.countDocuments({
      status: { $in: ["new", "in-progress", "awaiting-customer"] },
      createdAt: { $lt: weekStart },
    }),
    Customer.countDocuments({}),
    Customer.countDocuments({ createdAt: { $lt: monthStart } }),
    LoyaltyAccount.countDocuments({}),
    LoyaltyAccount.countDocuments({ createdAt: { $lt: monthStart } }),
    Order.aggregate<{ _id: null; units: number }>([
      { $match: { placedAt: { $gte: monthStart } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          units: { $sum: "$items.quantity" },
        },
      },
    ]),
    Order.aggregate<DailyRevenueRow>([
      { $match: { placedAt: { $gte: dailySeriesStart } } },
      {
        $group: {
          _id: {
            $dateToString: { date: "$placedAt", format: "%Y-%m-%d" },
          },
          rupees: { $sum: "$totals.totalRupees" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Inquiry.find()
      .sort({ createdAt: -1 })
      .limit(RECENT_INQUIRIES_LIMIT)
      .lean<InquiryLean[]>(),
  ]);

  const statusMap = new Map<string, number>();
  for (const bucket of statusBuckets) {
    statusMap.set(bucket._id, bucket.count);
  }

  const sumStatuses = (statuses: readonly string[]) =>
    statuses.reduce((total, status) => total + (statusMap.get(status) ?? 0), 0);

  const dailyRevenue: { date: string; rupees: number }[] = [];
  const dailyMap = new Map(dailyRevenueRows.map((row) => [row._id, row.rupees]));
  for (let i = 0; i < DAILY_SERIES_DAYS; i += 1) {
    const date = new Date(dailySeriesStart);
    date.setDate(date.getDate() + i);
    const key = date.toISOString().slice(0, ISO_DATE_LENGTH);
    dailyRevenue.push({ date: key, rupees: dailyMap.get(key) ?? 0 });
  }

  const productStats = productAgg[0] ?? {
    _id: null,
    modelsListed: 0,
    unitsInStock: 0,
    lowStockVariants: 0,
  };

  const kpis: DashboardKpis = {
    ordersToday: todayAgg.count,
    ordersThisWeek: weekAgg.count,
    ordersThisMonth: monthAgg.count,
    salesTodayRupees: todayAgg.totalRupees,
    salesThisWeekRupees: weekAgg.totalRupees,
    salesThisMonthRupees: monthAgg.totalRupees,
    pendingPayments: sumStatuses(PENDING_STATUSES),
    confirmedPayments: sumStatuses(CONFIRMED_STATUSES),
    dispatched: sumStatuses(DISPATCHED_STATUSES),
    moneyBackClaimsThisMonth: moneyBackThisMonth,
    unitsInStock: productStats.unitsInStock,
    lowStockVariants: productStats.lowStockVariants,
    modelsListed: productStats.modelsListed,
    unitsSoldThisMonth: unitsSoldThisMonthAgg[0]?.units ?? 0,
    openInquiries,
    totalCustomers: customerCount,
    loyaltyMembers: loyaltyCount,

    changePercents: {
      ordersToday: changePercent(todayAgg.count, yesterdayAgg.count),
      salesToday: changePercent(todayAgg.totalRupees, yesterdayAgg.totalRupees),
      ordersWeek: changePercent(weekAgg.count, lastWeekAgg.count),
      salesWeek: changePercent(weekAgg.totalRupees, lastWeekAgg.totalRupees),
      ordersMonth: changePercent(monthAgg.count, lastMonthAgg.count),
      salesMonth: changePercent(monthAgg.totalRupees, lastMonthAgg.totalRupees),
      pendingPayments: 0,
      confirmedPayments: 0,
      dispatched: 0,
      units: 0,
      lowStock: 0,
      inquiries: changePercent(openInquiries, openInquiriesLastWeek),
      customers: changePercent(customerCount, customerCountLastMonth),
      loyalty: changePercent(loyaltyCount, loyaltyCountLastMonth),
    },
  };

  const recentInquiries = recentInquiryDocs.map(toInquiryResponse);

  return { kpis, dailyRevenue, recentInquiries };
}
