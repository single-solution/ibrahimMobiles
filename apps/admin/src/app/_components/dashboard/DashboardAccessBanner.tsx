"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function DashboardAccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (searchParams.get("access") !== "denied") return;
    toast.warn("You do not have permission to open that page.");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("access");
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  }, [router, searchParams, toast]);

  return null;
}
