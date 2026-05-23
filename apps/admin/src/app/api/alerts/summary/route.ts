import { ok } from "@store/shared";

import { requireSession } from "@/lib/api/requireSession";
import { loadAlertSummary } from "@/lib/server/alertSummary";

export async function GET() {
  const { response } = await requireSession();
  if (response) {
    return response;
  }

  const summary = await loadAlertSummary();
  return ok(summary);
}
