import type { GradeDescriptor } from "@store/shared";

export interface GradeCategoryGroup {
  categorySlug: string;
  categoryLabel: string;
  grades: GradeDescriptor[];
}

interface CategorySortInput {
  slug: string;
  label: string;
  sortOrder?: number;
}

/** Group storefront grades by category, ordered like admin category sort. */
export function buildGradeCategoryGroups(
  grades: GradeDescriptor[],
  categories: CategorySortInput[],
): GradeCategoryGroup[] {
  const labelBySlug = new Map(categories.map((category) => [category.slug, category.label]));
  const orderBySlug = new Map(
    categories.map((category) => [category.slug, category.sortOrder ?? 0]),
  );

  const gradesByCategory = new Map<string, GradeDescriptor[]>();
  for (const grade of grades) {
    const existing = gradesByCategory.get(grade.categorySlug) ?? [];
    existing.push(grade);
    gradesByCategory.set(grade.categorySlug, existing);
  }

  return Array.from(gradesByCategory.entries())
    .map(([categorySlug, categoryGrades]) => ({
      categorySlug,
      categoryLabel: labelBySlug.get(categorySlug) ?? categorySlug,
      grades: categoryGrades,
    }))
    .sort(
      (left, right) =>
        (orderBySlug.get(left.categorySlug) ?? 0) - (orderBySlug.get(right.categorySlug) ?? 0),
    );
}
