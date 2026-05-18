import bcrypt from "bcryptjs";
import {
  badRequest,
  BCRYPT_ROUNDS,
  created,
  FIELD_LIMITS,
  isValidationError,
  ok,
  parseBody,
  validateEmail,
  validatePassword,
  validateString,
} from "@store/shared";
import {
  connectDB,
  handleMongoError,
  User,
  USER_ROLES,
  type UserRole,
} from "@store/db";

import { requireSession } from "@/lib/api/requireSession";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";

import { recordActivity } from "@/lib/services/activityLog";

import { toUserResponse, type UserLean } from "@/lib/serializers/user";
import type { AdminUser } from "@/types/admin";

export async function GET(request: Request) {
  const { response } = await requireSession("team_view");
  if (response) {
    return response;
  }

  await connectDB();
  const { page, limit, skip, search, searchPattern } = readListOptions(request);

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: searchPattern, $options: "i" } },
      { email: { $regex: searchPattern, $options: "i" } },
      { phoneNumber: { $regex: searchPattern, $options: "i" } },
    ];
  }

  const [docs, total] = await Promise.all([
    User.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean<UserLean[]>(),
    User.countDocuments(filter),
  ]);

  const payload: ListResponse<AdminUser> = {
    items: docs.map(toUserResponse),
    total,
    page,
    limit,
  };
  return ok(payload);
}

interface UserInput {
  name?: unknown;
  email?: unknown;
  phoneNumber?: unknown;
  password?: unknown;
  role?: unknown;
  isActive?: unknown;
  isSuperAdmin?: unknown;
}

function parseRole(value: unknown): UserRole {
  if (typeof value === "string" && (USER_ROLES as readonly string[]).includes(value)) {
    return value as UserRole;
  }
  return "staff";
}

export async function POST(request: Request) {
  const { actor, response } = await requireSession("team_invite");
  if (response) {
    return response;
  }

  const body = await parseBody<UserInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const nameResult = validateString(body.name, {
    label: "Name",
    max: FIELD_LIMITS.shortText,
  });
  if (isValidationError(nameResult)) {
    return badRequest(nameResult.error);
  }

  const emailResult = validateEmail(body.email);
  if (isValidationError(emailResult)) {
    return badRequest(emailResult.error);
  }

  const passwordResult = validatePassword(body.password);
  if (isValidationError(passwordResult)) {
    return badRequest(passwordResult.error);
  }

  const phone =
    typeof body.phoneNumber === "string" && body.phoneNumber.trim().length > 0
      ? body.phoneNumber.trim().slice(0, FIELD_LIMITS.phoneNumber)
      : undefined;

  const role = parseRole(body.role);
  const isSuperAdmin = role === "owner" && body.isSuperAdmin === true && actor.isSuperAdmin;

  await connectDB();
  try {
    const passwordHash = await bcrypt.hash(passwordResult, BCRYPT_ROUNDS);
    const doc = await User.create({
      name: nameResult,
      email: emailResult,
      phoneNumber: phone,
      passwordHash,
      role,
      isActive: body.isActive !== false,
      isSuperAdmin,
    });
    await recordActivity({
      actor,
      action: "invited",
      resourceType: "team",
      resourceId: doc._id.toString(),
      resourceLabel: doc.name,
      detail: `Role: ${role}`,
    });
    return created(toUserResponse(doc.toObject() as UserLean));
  } catch (error) {
    return handleMongoError(error);
  }
}
