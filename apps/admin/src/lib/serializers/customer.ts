import type { Types } from "mongoose";
import type {
  CustomerAttributes,
  CustomerAddressAttributes,
} from "@store/db";
import type { AdminCustomer, AdminCustomerAddress } from "@/types/admin";

export type CustomerLean = CustomerAttributes & { _id: Types.ObjectId };

interface CustomerStats {
  orderCount: number;
  lifetimeSpendRupees: number;
  lastOrderAt?: Date;
}

function toAddress(address: CustomerAddressAttributes): AdminCustomerAddress {
  return {
    id: address._id?.toString() ?? "",
    label: address.label,
    recipientName: address.recipientName,
    phoneNumber: address.phoneNumber,
    city: address.city,
    area: address.area,
    street: address.street,
    postalCode: address.postalCode,
    isDefault: address.isDefault,
  };
}

export function toCustomerResponse(
  customer: CustomerLean,
  stats: CustomerStats = { orderCount: 0, lifetimeSpendRupees: 0 },
): AdminCustomer {
  return {
    id: customer._id.toString(),
    name: customer.name,
    email: customer.email,
    phoneNumber: customer.phoneNumber,
    city: customer.city,
    isLoyaltyMember: customer.isLoyaltyMember,
    orderCount: stats.orderCount,
    lifetimeSpendRupees: stats.lifetimeSpendRupees,
    lastOrderAt: stats.lastOrderAt?.toISOString(),
    notes: customer.notes,
    addresses: (customer.addresses ?? []).map(toAddress),
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}
