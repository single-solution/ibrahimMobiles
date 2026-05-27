"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { ColoredPill } from "@/components/shared/ColoredPill";

import {
  type AttributeChipGroup,
  type AttributeChipModel,
  type ChipRowLayout,
} from "./productCardChipModel";

interface AttributeGroupSegment {
  attributeSlug: string;
  allChips: AttributeChipModel[];
}

function isColorChipGroup(chips: AttributeChipModel[]): boolean {
  return chips.some((chip) => Boolean(chip.backgroundColor));
}

function expandAttributeGroup(group: AttributeChipGroup): AttributeGroupSegment {
  return {
    attributeSlug: group.attributeSlug,
    allChips: group.chips,
  };
}

function createFullChipRowLayout(segments: AttributeGroupSegment[]): ChipRowLayout {
  return {
    segmentCount: segments.length,
    visibleCounts: segments.map((segment) => segment.allChips.length),
  };
}

function shrinkChipRowLayout(layout: ChipRowLayout): ChipRowLayout | null {
  if (layout.segmentCount <= 0) {
    return null;
  }

  // Prefer trimming the widest attribute pill so other attribute groups stay visible.
  let shrinkIndex = -1;
  let maxVisible = 1;
  for (let index = 0; index < layout.segmentCount; index += 1) {
    const visible = layout.visibleCounts[index] ?? 1;
    if (visible > maxVisible) {
      maxVisible = visible;
      shrinkIndex = index;
    }
  }

  if (shrinkIndex >= 0 && maxVisible > 1) {
    const visibleCounts = [...layout.visibleCounts];
    visibleCounts[shrinkIndex] = maxVisible - 1;
    return { ...layout, visibleCounts };
  }

  // Every visible group is down to one value (+N more in-pill) — drop trailing groups last.
  if (layout.segmentCount > 1) {
    return {
      segmentCount: layout.segmentCount - 1,
      visibleCounts: layout.visibleCounts.slice(0, layout.segmentCount - 1),
    };
  }

  return null;
}

function buildAttributeGroupSegments(
  groups: AttributeChipGroup[],
): AttributeGroupSegment[] {
  return groups
    .map((group) => expandAttributeGroup(group))
    .filter((segment) => segment.allChips.length > 0);
}

export function GroupedAttributeChipRow({
  groups,
  maxHeightPx,
  variant = "title",
}: {
  groups: AttributeChipGroup[];
  maxHeightPx: number;
  variant?: "title" | "overlay";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segments = useMemo(() => buildAttributeGroupSegments(groups), [groups]);
  const [layout, setLayout] = useState<ChipRowLayout>(() =>
    createFullChipRowLayout(segments),
  );

  useLayoutEffect(() => {
    scheduleStateUpdate(() => {
      setLayout(createFullChipRowLayout(segments));
    });
  }, [segments]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setLayout(createFullChipRowLayout(segments));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [segments]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || segments.length === 0) {
      return;
    }
    if (container.scrollHeight <= maxHeightPx + 1) {
      return;
    }

    setLayout((current) => shrinkChipRowLayout(current) ?? current);
  }, [layout, maxHeightPx, segments.length]);

  if (segments.length === 0) {
    return null;
  }

  const visibleSegments = segments.slice(0, layout.segmentCount);
  const rowOverflowChips = segments
    .slice(layout.segmentCount)
    .flatMap((segment) => segment.allChips);
  const lastVisibleIndex = visibleSegments.length - 1;
  const mergeRowOverflowIntoLast =
    rowOverflowChips.length > 0 && lastVisibleIndex >= 0;

  return (
    <div
      ref={containerRef}
      className="flex min-w-0 flex-wrap items-center gap-1 overflow-hidden"
      style={{ maxHeight: maxHeightPx }}
    >
      {visibleSegments.map((segment, index) => {
        const visibleCount = layout.visibleCounts[index] ?? segment.allChips.length;
        const segmentHidden = segment.allChips.slice(visibleCount);
        const mergeOverflow = mergeRowOverflowIntoLast && index === lastVisibleIndex;
        const visible = segment.allChips.slice(0, visibleCount);
        const hidden = mergeOverflow
          ? [...segmentHidden, ...rowOverflowChips]
          : segmentHidden;
        const allChips = mergeOverflow
          ? [...segment.allChips, ...rowOverflowChips]
          : segment.allChips;

        return (
          <AttributeGroupPill
            key={segment.attributeSlug}
            visible={visible}
            hidden={hidden}
            allChips={allChips}
            variant={variant}
          />
        );
      })}
    </div>
  );
}

function formatGroupPillLabel(
  visible: AttributeChipModel[],
  hiddenCount: number,
): string {
  if (visible.length === 0) {
    return `+${hiddenCount} more`;
  }
  const shown = visible.map((chip) => chip.label).join(", ");
  if (hiddenCount === 0) {
    return shown;
  }
  return `${shown} +${hiddenCount} more`;
}

function AttributeGroupPill({
  visible,
  hidden,
  allChips,
  variant = "title",
}: {
  visible: AttributeChipModel[];
  hidden: AttributeChipModel[];
  allChips: AttributeChipModel[];
  variant?: "title" | "overlay";
}) {
  const hiddenCount = hidden.length;
  if (visible.length === 0 && hiddenCount === 0) {
    return null;
  }

  const label = formatGroupPillLabel(visible, hiddenCount);
  const pillClass =
    "inline-flex max-w-full items-center truncate rounded-full border px-1.5 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur md:px-2 md:text-[11px]";
  const neutralClass =
    variant === "overlay"
      ? `${pillClass} border-[var(--color-on-light-10)] bg-[var(--color-surface)]/95 text-[var(--color-ink-900)]`
      : `${pillClass} border-[var(--color-on-light-05)] bg-[var(--color-surface)]/90 text-[var(--color-ink-800)]`;
  const accentColor =
    visible.find((chip) => chip.backgroundColor)?.backgroundColor ??
    allChips.find((chip) => chip.backgroundColor)?.backgroundColor;
  const useColorPill = Boolean(accentColor) && isColorChipGroup(allChips);
  const title = allChips.map((chip) => chip.label).join(", ");

  if (useColorPill && accentColor) {
    return (
      <span title={title} className="inline-flex max-w-full min-w-0">
        <ColoredPill
          backgroundColor={accentColor}
          className={`${pillClass} border-transparent`}
        >
          {label}
        </ColoredPill>
      </span>
    );
  }

  return (
    <span className={neutralClass} title={title}>
      {label}
    </span>
  );
}
