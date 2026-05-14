"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface VariantContextValue {
  selectedVariantId: string;
  setSelectedVariantId: (id: string) => void;
}

const VariantContext = createContext<VariantContextValue | null>(null);

interface VariantProviderProps {
  initialVariantId: string;
  children: ReactNode;
}

export function VariantProvider({ initialVariantId, children }: VariantProviderProps) {
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);
  return (
    <VariantContext.Provider value={{ selectedVariantId, setSelectedVariantId }}>
      {children}
    </VariantContext.Provider>
  );
}

export function useSelectedVariantId(): string {
  const ctx = useContext(VariantContext);
  if (!ctx) {
    throw new Error("useSelectedVariantId must be used within a VariantProvider");
  }
  return ctx.selectedVariantId;
}

export function useVariantSelection(): VariantContextValue {
  const ctx = useContext(VariantContext);
  if (!ctx) {
    throw new Error("useVariantSelection must be used within a VariantProvider");
  }
  return ctx;
}
