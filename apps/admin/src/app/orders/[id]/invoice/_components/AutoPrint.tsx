"use client";

import { useEffect } from "react";

export function AutoPrint() {
  useEffect(() => {
    // Ensure styles and fonts are loaded before triggering print
    const timeout = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

  return null;
}
