/**
 * Best-effort delete endpoint for variant URLs.
 *
 * The gallery / single-image components POST here when the user removes
 * an image so we don't leak storage objects. Errors are swallowed
 * (returned as 200 with an `errors` array) because the UI should not
 * block on cleanup — the worst case is an orphan object that can be
 * reaped offline.
 */

import { NextResponse } from "next/server";
import { logger, resolveStorageProvider } from "@store/shared";

import { requireSession } from "@/lib/api/requireSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RemovePayload {
  urls?: unknown;
}

const MAX_URLS_PER_CALL = 16;

export async function POST(request: Request): Promise<NextResponse> {
  const { actor, response } = await requireSession();
  if (response) return response;
  const userId = actor.id;

  let payload: RemovePayload;
  try {
    payload = (await request.json()) as RemovePayload;
  } catch {
    return NextResponse.json({ error: "Expected JSON body." }, { status: 400 });
  }
  if (!Array.isArray(payload.urls) || payload.urls.length === 0) {
    return NextResponse.json({ error: "`urls` must be a non-empty array." }, { status: 400 });
  }
  if (payload.urls.length > MAX_URLS_PER_CALL) {
    return NextResponse.json(
      { error: `Up to ${MAX_URLS_PER_CALL} URLs per request.` },
      { status: 400 },
    );
  }

  const storage = resolveStorageProvider();
  const errors: string[] = [];
  for (const raw of payload.urls) {
    if (typeof raw !== "string") {
      errors.push("non-string url skipped");
      continue;
    }
    try {
      await storage.remove(raw);
    } catch (error) {
      logger.warn({ error, userId, url: raw }, "uploads/remove: best-effort delete failed");
      errors.push(raw);
    }
  }

  return NextResponse.json({ removed: payload.urls.length - errors.length, errors });
}
