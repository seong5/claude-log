import { useState, useMemo } from "react";

export interface DayData {
  date: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  sessions: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: DayData | null;
}

const INTENSITY_COLORS = [
  "#ffffff", // level 0 - no usage
  "#7c2d12", // level 1 - low
  "#c2410c", // level 2 - medium-low
  "#ea580c", // level 3 - medium-high
  "#fb923c", // level 4 - high
  "#fed7aa", // level 5 - very high
];

const EMPTY_CELL_BORDER = "#ecdccc";

function getIntensityLevel(tokens: number, maxTokens: number): number {
  if (tokens === 0) return 0;
  const ratio = tokens / maxTokens;
  if (ratio < 0.15) return 1;
  if (ratio < 0.35) return 2;
  if (ratio < 0.6) return 3;
  if (ratio < 0.85) return 4;
  return 5;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

interface Props {
  data: DayData[];
}

export default function TokenHeatmap({ data }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  });

  const maxTokens = useMemo(() => Math.max(...data.map((d) => d.tokens), 1), [data]);

  // Build weeks grid: each column = 1 week (Sun→Sat)
  const weeks = useMemo(() => {
    const result: (DayData | null)[][] = [];
    // Find the starting Sunday
    const firstDate = new Date(data[0].date + "T00:00:00");
    const startDow = firstDate.getDay(); // 0=Sun
    // Pad beginning with nulls
    let current: (DayData | null)[] = Array(startDow).fill(null);

    for (const day of data) {
      current.push(day);
      if (current.length === 7) {
        result.push(current);
        current = [];
      }
    }
    if (current.length > 0) {
      while (current.length < 7) current.push(null);
      result.push(current);
    }
    return result;
  }, [data]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const firstReal = week.find((d) => d !== null);
      if (!firstReal) return;
      const m = new Date(firstReal.date + "T00:00:00").getMonth();
      if (m !== lastMonth) {
        labels.push({
          label: new Date(firstReal.date + "T00:00:00").toLocaleDateString("ko-KR", {
            month: "short",
          }),
          weekIndex: wi,
        });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  const DAY_LABELS = ["일", "", "화", "", "목", "", "토"];
  const CELL = 13;
  const GAP = 2;

  return (
    <div className="relative select-none">
      {/* Month labels */}
      <div className="flex mb-1 ml-8">
        {weeks.map((_, wi) => {
          const found = monthLabels.find((m) => m.weekIndex === wi);
          return (
            <div
              key={wi}
              style={{ width: CELL + GAP, flexShrink: 0 }}
              className="text-xs text-gray-500 overflow-hidden whitespace-nowrap"
            >
              {found ? found.label : ""}
            </div>
          );
        })}
      </div>

      <div className="flex gap-0">
        {/* Day labels */}
        <div className="flex flex-col mr-1" style={{ gap: GAP }}>
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              style={{ width: 24, height: CELL, fontSize: 10 }}
              className="text-gray-500 flex items-center justify-end pr-1"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="flex" style={{ gap: GAP }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
              {week.map((day, di) => {
                const level = day ? getIntensityLevel(day.tokens, maxTokens) : -1;
                const bg = day === null ? "#ffffff" : INTENSITY_COLORS[level];
                const isInactive = day === null || level === 0;
                return (
                  <div
                    key={di}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 2,
                      backgroundColor: bg,
                      border: isInactive
                        ? `1px solid ${EMPTY_CELL_BORDER}`
                        : "1px solid transparent",
                      boxSizing: "border-box",
                      cursor: day ? "pointer" : "default",
                      transition: "transform 0.1s",
                    }}
                    className={day ? "hover:scale-125 hover:z-10" : ""}
                    onMouseEnter={(e) => {
                      if (!day) return;
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({
                        visible: true,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8,
                        data: day,
                      });
                    }}
                    onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-3 ml-8">
        <span className="text-xs text-gray-500 mr-1">적음</span>
        {INTENSITY_COLORS.map((color, i) => (
          <div
            key={i}
            style={{
              width: CELL,
              height: CELL,
              borderRadius: 2,
              backgroundColor: color,
              border: i === 0 ? `1px solid ${EMPTY_CELL_BORDER}` : "1px solid transparent",
              boxSizing: "border-box",
            }}
          />
        ))}
        <span className="text-xs text-gray-500 ml-1">많음</span>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.data && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          <div
            className="rounded-lg px-3 py-2 text-xs shadow-xl border"
            style={{ backgroundColor: "#1c1917", borderColor: "#44403c", minWidth: 180 }}
          >
            <div className="font-semibold text-orange-300 mb-1">
              {formatDate(tooltip.data.date)}
            </div>
            <div className="text-gray-300 space-y-0.5">
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">총 토큰</span>
                <span className="font-mono text-orange-200">
                  {formatTokens(tooltip.data.tokens)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">입력</span>
                <span className="font-mono">{formatTokens(tooltip.data.inputTokens)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">출력</span>
                <span className="font-mono">{formatTokens(tooltip.data.outputTokens)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">세션</span>
                <span className="font-mono">{tooltip.data.sessions}회</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
