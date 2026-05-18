import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInView } from "@/components/account/SignInView";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with a one-time code sent to your phone.",
};

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInView />
    </Suspense>
  );
}
