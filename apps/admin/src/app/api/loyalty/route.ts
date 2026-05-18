import type { Types } from "mongoose";

import { requireSession } from "@/lib/api/requireSession";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";
import { ok } from "@store/shared";
import { toLoyaltyAccountResponse, type LoyaltyAccountLean } from "@/lib/serializers/loyalty";
import { type CustomerLean } from "@/lib/serializers/customer";
import type { AdminLoyaltyAccount } from "@/types/admin";
import { connectDB, Customer, LoyaltyAccount } from "@store/db";

interface SearchedCustomer {
  _id: Types.ObjectId;
  name: string;
}

export async function GET(request: Request) {
  const { response } = await requireSession();
  if (response) {
    return response;
  }

  await connectDB();
  const { page, limit, skip, search, searchPattern } = readListOptions(request);

  // Search resolves customer IDs first then filters accounts by `$in` so we
  // don't have to load every customer just to map names later. Without a
  // search we go straight to the accounts collection and only fetch names
  // for the page we're returning (O(limit) lookups, not O(customers)).
  let accountFilter: Record<string, unknown> = {};
  let searchedCustomers: SearchedCustomer[] | null = null;
  if (search) {
    searchedCustomers = await Customer.find({
      $or: [
        { name: { $regex: searchPattern, $options: "i" } },
        { phoneNumber: { $regex: searchPattern, $options: "i" } },
      ],
    })
      .select("_id name")
      .lean<CustomerLean[]>();
    if (searchedCustomers.length === 0) {
      const empty: ListResponse<AdminLoyaltyAccount> = { items: [], total: 0, page, limit };
      return ok(empty);
    }
    accountFilter = { customerId: { $in: searchedCustomers.map((customer) => customer._id) } };
  }

  const [accounts, total] = await Promise.all([
    LoyaltyAccount.find(accountFilter)
      .sort({ balance: -1 })
      .skip(skip)
      .limit(limit)
      .lean<LoyaltyAccountLean[]>(),
    LoyaltyAccount.countDocuments(accountFilter),
  ]);

  const customerNameById = await resolveCustomerNames(searchedCustomers, accounts);

  const items: AdminLoyaltyAccount[] = accounts.map((account) =>
    toLoyaltyAccountResponse(
      account,
      customerNameById.get(account.customerId.toString()) ?? "Unknown",
    ),
  );

  const payload: ListResponse<AdminLoyaltyAccount> = { items, total, page, limit };
  return ok(payload);
}

/**
 * Build a `customerId → name` map covering every account on the current page.
 * Reuses the names already loaded by the search step when present, otherwise
 * issues a single `$in` lookup scoped to the page.
 */
async function resolveCustomerNames(
  searchedCustomers: SearchedCustomer[] | null,
  accounts: LoyaltyAccountLean[],
): Promise<Map<string, string>> {
  if (searchedCustomers) {
    return new Map(
      searchedCustomers.map((customer) => [customer._id.toString(), customer.name]),
    );
  }
  const pageCustomerIds = accounts.map((account) => account.customerId);
  const pageCustomers = await Customer.find({ _id: { $in: pageCustomerIds } })
    .select("_id name")
    .lean<CustomerLean[]>();
  return new Map(pageCustomers.map((customer) => [customer._id.toString(), customer.name]));
}
