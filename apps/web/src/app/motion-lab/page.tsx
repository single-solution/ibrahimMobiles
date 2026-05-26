import type { Metadata } from "next";

import { MotionLab } from "@/components/motion-lab/MotionLab";

export const metadata: Metadata = {
  title: "Motion lab — pick a direction",
  robots: { index: false, follow: false },
};

export default function MotionLabPage() {
  return <MotionLab />;
}
