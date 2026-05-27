/**
 * POST /api/storefront/vitals
 *
 * Lightweight RUM sink for Core Web Vitals when GA4 is not configured
 * (or as a server-side audit trail). The client reporter prefers `gtag`
 * when available and falls back to this endpoint.
 *
 * Security:
 *   - Rate-limited per IP (each page load emits ~5 metrics).
 *   - Strict metric-name allowlist — no arbitrary payloads.
 *   - Values clamped to sane ranges so logs stay useful.
 */

import { logger, ok, PER_MINUTE_WINDOW_MS } from "@store/shared";

import { enforcePublicRateLimit } from "@/lib/api/publicRateLimit";

export const dynamic = "force-dynamic";

const VITALS_PER_MINUTE = 40;

const ALLOWED_METRICS = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);

const MAX_VALUE = 120_000;

interface VitalsBody {
  name?: string;
  value?: number;
  id?: string;
  rating?: string;
  navigationType?: string;
}

export async function POST(request: Request) {
  const limited = enforcePublicRateLimit(request, {
    scope: "storefront-vitals",
    max: VITALS_PER_MINUTE,
    windowMs: PER_MINUTE_WINDOW_MS,
  });
  if (limited) {
    return limited;
  }

  let body: VitalsBody;
  try {
    body = (await request.json()) as VitalsBody;
  } catch {
    return ok({ accepted: false });
  }

  const name = typeof body.name === "string" ? body.name.trim().toUpperCase() : "";
  if (!ALLOWED_METRICS.has(name)) {
    return ok({ accepted: false });
  }

  const rawValue = body.value;
  if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
    return ok({ accepted: false });
  }

  const value = Math.min(Math.max(rawValue, 0), MAX_VALUE);

  logger.info(
    {
      metric: name,
      value,
      id: typeof body.id === "string" ? body.id.slice(0, 64) : undefined,
      rating: typeof body.rating === "string" ? body.rating.slice(0, 16) : undefined,
      navigationType:
        typeof body.navigationType === "string"
          ? body.navigationType.slice(0, 32)
          : undefined,
    },
    "storefront: web vital",
  );

  return ok({ accepted: true });
}
