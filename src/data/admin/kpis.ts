export interface KpiSnapshot {
  unitsInStock: number;
  modelsListed: number;
  unitsSoldThisMonth: number;
  revenueThisMonthRupees: number;
  openInquiries: number;
  lowStockVariants: number;
  averageOrderValueRupees: number;
  moneyBackClaimsThisMonth: number;
  changePercents: {
    units: number;
    revenue: number;
    inquiries: number;
    aov: number;
  };
}

export const adminKpis: KpiSnapshot = {
  unitsInStock: 87,
  modelsListed: 24,
  unitsSoldThisMonth: 142,
  revenueThisMonthRupees: 18_640_000,
  openInquiries: 17,
  lowStockVariants: 6,
  averageOrderValueRupees: 131_268,
  moneyBackClaimsThisMonth: 2,
  changePercents: {
    units: 8,
    revenue: 14,
    inquiries: -3,
    aov: 5,
  },
};

export const dailyRevenueSeries: Array<{ date: string; rupees: number }> = [
  { date: "Apr 14", rupees: 480_000 },
  { date: "Apr 15", rupees: 612_000 },
  { date: "Apr 16", rupees: 540_000 },
  { date: "Apr 17", rupees: 780_000 },
  { date: "Apr 18", rupees: 690_000 },
  { date: "Apr 19", rupees: 925_000 },
  { date: "Apr 20", rupees: 1_140_000 },
  { date: "Apr 21", rupees: 870_000 },
  { date: "Apr 22", rupees: 720_000 },
  { date: "Apr 23", rupees: 990_000 },
  { date: "Apr 24", rupees: 660_000 },
  { date: "Apr 25", rupees: 540_000 },
  { date: "Apr 26", rupees: 1_220_000 },
  { date: "Apr 27", rupees: 815_000 },
  { date: "Apr 28", rupees: 905_000 },
  { date: "Apr 29", rupees: 1_080_000 },
  { date: "Apr 30", rupees: 1_320_000 },
  { date: "May 01", rupees: 1_440_000 },
  { date: "May 02", rupees: 770_000 },
  { date: "May 03", rupees: 940_000 },
  { date: "May 04", rupees: 1_010_000 },
  { date: "May 05", rupees: 1_280_000 },
  { date: "May 06", rupees: 880_000 },
  { date: "May 07", rupees: 720_000 },
  { date: "May 08", rupees: 990_000 },
  { date: "May 09", rupees: 1_120_000 },
  { date: "May 10", rupees: 980_000 },
  { date: "May 11", rupees: 1_380_000 },
  { date: "May 12", rupees: 1_460_000 },
  { date: "May 13", rupees: 1_245_000 },
];

export const stockTypeDistribution: Array<{ label: string; value: number; color: string }> = [
  { label: "Genuine", value: 38, color: "var(--color-accent-600)" },
  { label: "Brand new", value: 12, color: "var(--color-ink-900)" },
  { label: "Box-open", value: 9, color: "#0284c7" },
  { label: "Refurbished", value: 14, color: "#94a3b8" },
  { label: "China pack", value: 11, color: "#d97706" },
  { label: "LCD shaded", value: 3, color: "#dc2626" },
];

export const topModelsByRevenue: Array<{
  modelName: string;
  unitsSold: number;
  revenueRupees: number;
}> = [
  { modelName: "iPhone 15 Pro", unitsSold: 24, revenueRupees: 7_896_000 },
  { modelName: "iPhone 14", unitsSold: 31, revenueRupees: 4_417_000 },
  { modelName: "Galaxy S24 Ultra", unitsSold: 11, revenueRupees: 3_245_000 },
  { modelName: "iPhone 13", unitsSold: 28, revenueRupees: 2_968_000 },
  { modelName: "Pixel 8 Pro", unitsSold: 9, revenueRupees: 1_476_000 },
];
