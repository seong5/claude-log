import { useState, useMemo, useRef, useEffect } from "react";
import type { DayData } from "../../../preload/index.d";
import { formatTokens } from "../lib/formatters";

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: DayData | null;
  isFuture: boolean;
}

// Heatmap usage colors: white → pale orange → deep orange (more tokens)
const INTENSITY_COLORS = [
  "#ffffff", // level 0 - no usage
  "#fff0e0", // level 1 - low (very light orange)
  "#ffc999", // level 2 - medium-light
  "#ff9f4a", // level 3 - medium-strong
  "#e85d04", // level 4 - deep orange
];

const EMPTY_CELL_BORDER = "#ecdccc";

function getIntensityLevel(tokens: number, maxTokens: number): number {
  if (tokens === 0) return 0;
  const ratio = tokens / maxTokens;
  if (ratio < 0.2) return 1;
  if (ratio < 0.45) return 2;
  if (ratio < 0.75) return 3;
  return 4;
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
  today: string;
}

export default function TokenHeatmap({ data, today }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
    isFuture: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const todayCellRef = useRef<HTMLDivElement>(null);

  // Scroll today into view on mount
  useEffect(() => {
    if (todayCellRef.current && containerRef.current) {
      const cell = todayCellRef.current;
      const container = containerRef.current;
      const cellLeft = cell.offsetLeft;
      const containerWidth = container.clientWidth;
      container.scrollLeft = cellLeft - containerWidth / 2;
    }
  }, [data]);

  // Only consider past + today for the intensity scale
  const maxTokens = useMemo(
    () => Math.max(...data.filter((d) => d.date <= today).map((d) => d.tokens), 1),
    [data, today],
  );

  // Build weeks grid
  const weeks = useMemo(() => {
    if (data.length === 0) return [];
    const result: (DayData | null)[][] = [];
    const firstDate = new Date(data[0].date + "T00:00:00");
    const startDow = firstDate.getDay();
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

  // Month labels — one row per week column (CELL wide); horizontal "1월" via scale to fit narrow column
  const monthLabels = useMemo(() => {
    const labels: { label: string; title: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const firstReal = week.find((d) => d !== null);
      if (!firstReal) return;
      const d = new Date(firstReal.date + "T00:00:00");
      const m = d.getMonth();
      if (m !== lastMonth) {
        labels.push({
          label: `${m + 1}월`,
          title: d.toLocaleDateString("ko-KR", { year: "numeric", month: "long" }),
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
  const MONTH_ROW_HEIGHT = 14;

  const dayLabelColWidth = 24;

  return (
    <div className="relative select-none">
      {/* Single horizontal scroll: month labels + grid stay aligned */}
      <div ref={containerRef} className="overflow-x-auto pb-2">
        <div className="flex gap-0" style={{ width: "max-content" }}>
          {/* Day-of-week labels (scroll with grid so month row stays column-aligned) */}
          <div
            className="flex flex-col shrink-0 mr-1"
            style={{ gap: GAP, width: dayLabelColWidth }}
          >
            <div className="shrink-0 mb-1" style={{ minHeight: MONTH_ROW_HEIGHT }} aria-hidden />
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                style={{ width: dayLabelColWidth, height: CELL, fontSize: 10 }}
                className="text-gray-500 flex items-center justify-end pr-1 shrink-0"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="flex flex-col shrink-0">
            {/* Month labels — same scroll container as cells */}
            <div className="flex mb-1 shrink-0" style={{ gap: GAP }}>
              {weeks.map((_, wi) => {
                const found = monthLabels.find((m) => m.weekIndex === wi);
                return (
                  <div
                    key={wi}
                    title={found?.title}
                    aria-label={found?.label}
                    style={{
                      width: CELL,
                      height: MONTH_ROW_HEIGHT,
                      flexShrink: 0,
                    }}
                    className="text-gray-500 flex items-center justify-center overflow-hidden"
                  >
                    {found ? (
                      <span
                        className="inline-block whitespace-nowrap"
                        style={{
                          fontSize: 12,
                          lineHeight: 1,
                          transform: "scale(0.6)",
                          transformOrigin: "center",
                        }}
                      >
                        {found.label}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Heatmap grid */}
            <div className="flex shrink-0" style={{ gap: GAP }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((day, di) => {
                    if (day === null) {
                      return <div key={di} style={{ width: CELL, height: CELL, flexShrink: 0 }} />;
                    }

                    const isFuture = day.date > today;
                    const level = getIntensityLevel(day.tokens, maxTokens);

                    // ── Future cell (시각은 사용량 0인 날과 동일, 툴팁만 예정) ──
                    if (isFuture) {
                      return (
                        <div
                          key={di}
                          style={{
                            width: CELL,
                            height: CELL,
                            borderRadius: 2,
                            backgroundColor: INTENSITY_COLORS[0],
                            border: `1px solid ${EMPTY_CELL_BORDER}`,
                            boxSizing: "border-box",
                            flexShrink: 0,
                            cursor: "pointer",
                            transition: "transform 0.1s",
                          }}
                          className="hover:scale-125 hover:z-10"
                          onMouseEnter={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setTooltip({
                              visible: true,
                              x: rect.left + rect.width / 2,
                              y: rect.top - 8,
                              data: day,
                              isFuture: true,
                            });
                          }}
                          onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
                        />
                      );
                    }

                    // ── 과거·오늘: 사용량 강도 색만 (오늘 전용 스타일 없음) ──
                    const bg = INTENSITY_COLORS[level];
                    const isEmpty = level === 0;
                    return (
                      <div
                        key={di}
                        ref={day.date === today ? todayCellRef : undefined}
                        style={{
                          width: CELL,
                          height: CELL,
                          borderRadius: 2,
                          backgroundColor: bg,
                          border: isEmpty
                            ? `1px solid ${EMPTY_CELL_BORDER}`
                            : "1px solid transparent",
                          boxSizing: "border-box",
                          flexShrink: 0,
                          cursor: "pointer",
                          transition: "transform 0.1s",
                        }}
                        className="hover:scale-125 hover:z-10"
                        onMouseEnter={(e) => {
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          setTooltip({
                            visible: true,
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8,
                            data: day,
                            isFuture: false,
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
        </div>
      </div>

      {/* Legend — indent to align with week columns when scroll position is 0 */}
      <div
        className="flex items-center gap-2 mt-3 flex-wrap"
        style={{ marginLeft: dayLabelColWidth + 4 }}
      >
        <span style={{ fontSize: 10, color: "#9a8070" }}>적음</span>
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
        <span style={{ fontSize: 10, color: "#9a8070" }}>많음</span>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.data && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          <div
            className="rounded-lg px-3 py-2 text-xs shadow-xl border"
            style={{
              backgroundColor: "#1c1917",
              borderColor: "#44403c",
              minWidth: tooltip.isFuture ? 140 : 180,
            }}
          >
            <div
              className="font-semibold mb-1"
              style={{ color: tooltip.isFuture ? "#9ca3af" : "#fdba74" }}
            >
              {formatDate(tooltip.data.date)}
              {tooltip.isFuture && (
                <span
                  className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "rgba(244,160,85,0.15)",
                    color: "#fb923c",
                    border: "1px dashed rgba(251,146,60,0.3)",
                  }}
                >
                  예정
                </span>
              )}
            </div>
            {tooltip.isFuture ? (
              <div style={{ color: "#6b7280", fontSize: 10 }}>아직 사용 내역이 없습니다</div>
            ) : (
              <div className="space-y-0.5" style={{ color: "#d1d5db" }}>
                <div className="flex justify-between gap-4">
                  <span style={{ color: "#9ca3af" }}>총 토큰</span>
                  <span className="font-mono" style={{ color: "#fed7aa" }}>
                    {formatTokens(tooltip.data.tokens)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: "#9ca3af" }}>입력</span>
                  <span className="font-mono">{formatTokens(tooltip.data.inputTokens)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: "#9ca3af" }}>출력</span>
                  <span className="font-mono">{formatTokens(tooltip.data.outputTokens)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: "#9ca3af" }}>세션</span>
                  <span className="font-mono">{tooltip.data.sessions}회</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
