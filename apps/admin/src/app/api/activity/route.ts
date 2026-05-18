import { requireSession } from "@/lib/api/requireSession";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";
import { ok } from "@store/shared";
import { toActivityResponse, type ActivityEntryLean } from "@/lib/serializers/activity";
import type { AdminActivityEntry } from "@/types/admin";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_RESOURCE_TYPES,
  ActivityEntry,
  connectDB,
} from "@store/db";

export async function GET(request: Request) {
  const { response } = await requireSession("activity_view");
  if (response) {
    return response;
  }

  await connectDB();
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const resourceType = url.searchParams.get("resourceType");
  const { page, limit, skip, search, searchPattern } = readListOptions(request);

  const filter: Record<string, unknown> = {};
  if (action && (ACTIVITY_ACTIONS as readonly string[]).includes(action)) {
    filter.action = action;
  }
  if (resourceType && (ACTIVITY_RESOURCE_TYPES as readonly string[]).includes(resourceType)) {
    filter.resourceType = resourceType;
  }
  if (search) {
    filter.$or = [
      { actorName: { $regex: searchPattern, $options: "i" } },
      { resourceLabel: { $regex: searchPattern, $options: "i" } },
      { detail: { $regex: searchPattern, $options: "i" } },
    ];
  }

  const [docs, total] = await Promise.all([
    ActivityEntry.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<ActivityEntryLean[]>(),
    ActivityEntry.countDocuments(filter),
  ]);

  const payload: ListResponse<AdminActivityEntry> = {
    items: docs.map(toActivityResponse),
    total,
    page,
    limit,
  };
  return ok(payload);
}
