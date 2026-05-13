interface MiniBarChartProps {
  values: number[];
  labels?: string[];
  height?: number;
  barGap?: number;
  formatValue?: (value: number) => string;
}

export function MiniBarChart({
  values,
  labels,
  height = 160,
  barGap = 3,
  formatValue,
}: MiniBarChartProps) {
  if (values.length === 0) {
    return null;
  }

  const maxValue = Math.max(...values);
  const safeMax = maxValue > 0 ? maxValue : 1;
  const barWidthPercent = 100 / values.length;

  return (
    <div>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex items-end" style={{ gap: barGap }}>
          {values.map((value, index) => {
            const barHeightPercent = (value / safeMax) * 100;
            const label = labels?.[index];
            const tooltipText = formatValue
              ? `${label ? `${label}: ` : ""}${formatValue(value)}`
              : `${label ?? ""} ${value}`;
            return (
              <div
                key={index}
                className="group relative flex flex-1 items-end"
                style={{ width: `${barWidthPercent}%` }}
                title={tooltipText}
              >
                <div
                  className="w-full rounded-t-[3px] bg-[var(--color-ink-900)] transition-colors group-hover:bg-[var(--color-accent-700)]"
                  style={{ height: `${Math.max(barHeightPercent, 2)}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
      {labels && (
        <div className="mt-2 flex" style={{ gap: barGap }}>
          {labels.map((label, index) => (
            <div
              key={`${label}-${index}`}
              className="flex flex-1 justify-center text-[10px] text-[var(--color-ink-400)]"
              style={{ width: `${barWidthPercent}%` }}
            >
              {index % Math.max(1, Math.floor(labels.length / 8)) === 0 ? label : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
