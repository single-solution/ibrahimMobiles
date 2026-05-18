import { requireSession } from "@/lib/api/requireSession";
import { ok } from "@store/shared";
import { toGradeResponse, type GradeLean } from "@/lib/serializers/grade";
import { connectDB, Grade } from "@store/db";

export async function GET() {
  const { response } = await requireSession();
  if (response) {
    return response;
  }

  await connectDB();
  const docs = await Grade.find().sort({ sortOrder: 1 }).lean<GradeLean[]>();
  return ok({ items: docs.map(toGradeResponse) });
}
