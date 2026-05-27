import type { Metadata } from "next";

import { MotionLab } from "@/app/motion-lab/_components/MotionLab";

export const metadata: Metadata = {
  title: "Motion lab — pick a direction",
  robots: { index: false, follow: false },
};

export default function MotionLabPage() {
  return <MotionLab />;
}
