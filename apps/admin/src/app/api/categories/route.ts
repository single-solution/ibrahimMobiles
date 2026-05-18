import { requireSession } from "@/lib/api/requireSession";
import { ok } from "@store/shared";
import { toCategoryResponse, type CategoryLean } from "@/lib/serializers/category";
import { Category, connectDB } from "@store/db";

export async function GET() {
  const { response } = await requireSession();
  if (response) {
    return response;
  }

  await connectDB();
  const docs = await Category.find().sort({ sortOrder: 1 }).lean<CategoryLean[]>();
  return ok({ items: docs.map(toCategoryResponse) });
}
