import type { Metadata } from "next";
import { ToastProvider } from "@/components/admin/Toast";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · Admin",
  },
  robots: { index: false, follow: false },
};

interface AdminRootLayoutProps {
  children: React.ReactNode;
}

export default function AdminRootLayout({ children }: AdminRootLayoutProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
