/**
 * Server-side queries for the customer-account section of the storefront.
 *
 * These run inside server components and route handlers — they require an
 * authenticated session (role = "customer") and they always scope queries
 * by `customerId` so a customer can never read another customer's data.
 */

import { Types } from "mongoose";

import {
  Customer,
  LoyaltyAccount,
  Order,
  connectDB,
  type CustomerAttributes,
  type LoyaltyAccountAttributes,
  type OrderAttributes,
} from "@store/db";

import { toStorefrontOrder, type StorefrontOrder } from "@/lib/storefront/orderSerializer";

export interface AccountCustomer {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  city: string;
  isLoyaltyMember: boolean;
  joinedAt: string;
  addresses: AccountAddress[];
}

export interface AccountAddress {
  id: string;
  label?: string;
  recipientName: string;
  phoneNumber: string;
  city: string;
  area?: string;
  street?: string;
  postalCode?: string;
  isDefault: boolean;
}

interface AccountLoyalty {
  balance: number;
  lifetimeEarned: number;
  pendingFromShipping: number;
}

/** Fetch the customer the session is tied to. Returns null if missing. */
export async function getAccountCustomer(customerId: string): Promise<AccountCustomer | null> {
  if (!Types.ObjectId.isValid(customerId)) {
    return null;
  }
  await connectDB();
  const customer = await Customer.findById(customerId).lean<
    CustomerAttributes & { _id: Types.ObjectId }
  >();
  if (!customer) {
    return null;
  }

  return {
    id: customer._id.toString(),
    name: customer.name,
    email: customer.email ?? "",
    phoneNumber: customer.phoneNumber,
    city: customer.city,
    isLoyaltyMember: customer.isLoyaltyMember,
    joinedAt: customer.createdAt.toISOString(),
    addresses: (customer.addresses ?? []).map((address) => ({
      id: address._id?.toString() ?? `${customer._id.toString()}:${address.recipientName}`,
      label: address.label,
      recipientName: address.recipientName,
      phoneNumber: address.phoneNumber,
      city: address.city,
      area: address.area,
      street: address.street,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
    })),
  };
}

/** Customer's order history, newest first. */
export async function getAccountOrders(customerId: string, limit = 50): Promise<StorefrontOrder[]> {
  if (!Types.ObjectId.isValid(customerId)) {
    return [];
  }
  await connectDB();
  const orders = await Order.find({ customerId: new Types.ObjectId(customerId) })
    .sort({ placedAt: -1 })
    .limit(limit)
    .lean<(OrderAttributes & { _id: Types.ObjectId })[]>();
  return orders.map(toStorefrontOrder);
}

/** Single order — only returns it if it belongs to this customer. */
export async function getAccountOrder(
  customerId: string,
  orderNumber: string,
): Promise<StorefrontOrder | null> {
  if (!Types.ObjectId.isValid(customerId)) {
    return null;
  }
  await connectDB();
  const order = await Order.findOne({
    customerId: new Types.ObjectId(customerId),
    orderNumber,
  }).lean<OrderAttributes & { _id: Types.ObjectId }>();
  return order ? toStorefrontOrder(order) : null;
}

/** Loyalty balance for a customer; returns null if they aren't a member. */
async function getAccountLoyalty(customerId: string): Promise<AccountLoyalty | null> {
  if (!Types.ObjectId.isValid(customerId)) {
    return null;
  }
  await connectDB();
  const account = await LoyaltyAccount.findOne({
    customerId: new Types.ObjectId(customerId),
  }).lean<LoyaltyAccountAttributes>();
  if (!account) {
    return null;
  }
  return {
    balance: account.balance,
    lifetimeEarned: account.lifetimeEarned,
    pendingFromShipping: account.pendingFromShipping,
  };
}

/** High-level account summary used by the /account landing page. */
interface AccountOverview {
  customer: AccountCustomer;
  loyalty: AccountLoyalty | null;
  recentOrders: StorefrontOrder[];
  activeCount: number;
  totalCount: number;
  totalSpentRupees: number;
}

const RECENT_ORDERS_DISPLAY_COUNT = 3;

const ACTIVE_STATUSES = new Set<OrderAttributes["status"]>([
  "pending-payment",
  "confirmed",
  "dispatched",
]);

export async function getAccountOverview(customerId: string): Promise<AccountOverview | null> {
  const customer = await getAccountCustomer(customerId);
  if (!customer) {
    return null;
  }

  await connectDB();
  const [orders, loyalty] = await Promise.all([
    Order.find({ customerId: new Types.ObjectId(customerId) })
      .sort({ placedAt: -1 })
      .lean<(OrderAttributes & { _id: Types.ObjectId })[]>(),
    getAccountLoyalty(customerId),
  ]);

  const recent = orders.slice(0, RECENT_ORDERS_DISPLAY_COUNT).map(toStorefrontOrder);
  const activeCount = orders.filter((order) => ACTIVE_STATUSES.has(order.status)).length;
  const totalSpent = orders
    .filter((order) => order.status !== "cancelled" && order.status !== "refunded")
    .reduce((sum, order) => sum + order.totals.totalRupees, 0);

  return {
    customer,
    loyalty,
    recentOrders: recent,
    activeCount,
    totalCount: orders.length,
    totalSpentRupees: totalSpent,
  };
}
