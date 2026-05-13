interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  segments,
  size = 140,
  thickness = 18,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = size / 2 - thickness / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-canvas-deep)"
            strokeWidth={thickness}
          />
          {segments.map((segment) => {
            const segmentLength = total > 0 ? (segment.value / total) * circumference : 0;
            const dashOffset = -cumulative;
            cumulative += segmentLength;
            return (
              <circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && (
              <p className="text-xl font-semibold tracking-[-0.01em] text-[var(--color-ink-900)]">
                {centerValue}
              </p>
            )}
            {centerLabel && (
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--color-ink-500)]">
                {centerLabel}
              </p>
            )}
          </div>
        )}
      </div>
      <ul className="flex flex-col gap-1.5 text-xs text-[var(--color-ink-700)]">
        {segments.map((segment) => {
          const percent = total > 0 ? Math.round((segment.value / total) * 100) : 0;
          return (
            <li key={segment.label} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: segment.color }}
              />
              <span className="flex-1 text-[var(--color-ink-700)]">{segment.label}</span>
              <span className="font-semibold text-[var(--color-ink-900)]">{percent}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
