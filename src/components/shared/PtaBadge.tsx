import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Pill } from "@/components/ui/Pill";

interface PtaBadgeProps {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function PtaBadge({ size = "md", showLabel = false, className }: PtaBadgeProps) {
  if (showLabel) {
    return (
      <Pill
        tone="neutral"
        size={size === "lg" ? "md" : "sm"}
        className={`!gap-2 !pl-1 ${className ?? ""}`}
        leadingIcon={
          <Badge tone="pak" size={size === "lg" ? "md" : "sm"}>
            <BadgeCheck size={11} strokeWidth={2.6} />
          </Badge>
        }
      >
        PTA Approved
      </Pill>
    );
  }

  return (
    <Badge tone="pak" size={size} className={className}>
      <BadgeCheck size={size === "sm" ? 10 : size === "md" ? 12 : 14} strokeWidth={2.6} />
      <span className="ml-0.5">PTA</span>
    </Badge>
  );
}
