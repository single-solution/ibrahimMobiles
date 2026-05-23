"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface VariantContextValue {
  selectedVariantId: string;
  setSelectedVariantId: (id: string) => void;
  /** Grade driving the PDP gallery — updates with the grade chip, not after URL settle. */
  galleryGradeSlug: string;
  setGalleryGradeSlug: (slug: string) => void;
}

const VariantContext = createContext<VariantContextValue | null>(null);

interface VariantProviderProps {
  initialVariantId: string;
  initialGalleryGradeSlug: string;
  children: ReactNode;
}

export function VariantProvider({
  initialVariantId,
  initialGalleryGradeSlug,
  children,
}: VariantProviderProps) {
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);
  const [galleryGradeSlug, setGalleryGradeSlug] = useState(initialGalleryGradeSlug);

  return (
    <VariantContext.Provider
      value={{
        selectedVariantId,
        setSelectedVariantId,
        galleryGradeSlug,
        setGalleryGradeSlug,
      }}
    >
      {children}
    </VariantContext.Provider>
  );
}

export function useSelectedVariantId(): string {
  const context = useContext(VariantContext);
  if (!context) {
    throw new Error("useSelectedVariantId must be used within a VariantProvider");
  }
  return context.selectedVariantId;
}

export function useVariantSelection(): VariantContextValue {
  const context = useContext(VariantContext);
  if (!context) {
    throw new Error("useVariantSelection must be used within a VariantProvider");
  }
  return context;
}

export function useGalleryGradeSlug(): string {
  const context = useContext(VariantContext);
  if (!context) {
    throw new Error("useGalleryGradeSlug must be used within a VariantProvider");
  }
  return context.galleryGradeSlug;
}
