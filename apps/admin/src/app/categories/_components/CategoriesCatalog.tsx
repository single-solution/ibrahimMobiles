"use client";

import { Suspense } from "react";

import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import type {
  AdminAttribute,
  AdminBrand,
  AdminCategory,
  AdminGrade,
} from "@/types/admin";

import { CategoriesCatalogInner } from "./CategoriesCatalogInner";

export interface CategoriesCatalogProps {
  initialCategories: AdminCategory[];
  initialBrands: AdminBrand[];
  initialGrades: AdminGrade[];
  initialAttributes: AdminAttribute[];
}

export function CategoriesCatalog(props: CategoriesCatalogProps) {
  return (
    <Suspense fallback={<AdminTableSkeleton columnCount={4} rowCount={8} />}>
      <CategoriesCatalogInner {...props} />
    </Suspense>
  );
}
