import type { ReactNode } from "react";

interface PageTitleProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageTitle({ actions }: PageTitleProps) {
  if (!actions) {
    return null;
  }
  return <div className="mb-3 flex flex-wrap items-center justify-end gap-2">{actions}</div>;
}
