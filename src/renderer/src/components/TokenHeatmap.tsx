import { useState, useMemo, useRef, useEffect } from "react";

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
  isFuture: boolean;
}

// Past data: darker = more usage
const INTENSITY_COLORS = [
  "#ffffff",  // level 0 - no usage
  "#7c2d12",  // level 1 - low
  "#c2410c",  // level 2 - medium-low
  "#ea580c",  // level 3 - medium-high
  "#fb923c",  // level 4 - high
  "#fed7aa",  // level 5 - very high
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
    [data, today]
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
              style={{ width: CELL + GAP, flexShrink: 0, fontSize: 10 }}
              className="text-gray-500 overflow-hidden whitespace-nowrap"
            >
              {found ? found.label : ""}
            </div>
          );
        })}
      </div>

      {/* Scrollable heatmap wrapper */}
      <div ref={containerRef} className="overflow-x-auto pb-2">
        <div className="flex gap-0" style={{ width: "max-content" }}>
          {/* Day labels */}
          <div className="flex flex-col mr-1" style={{ gap: GAP }}>
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                style={{ width: 24, height: CELL, fontSize: 10 }}
                className="text-gray-500 flex items-center justify-end pr-1 shrink-0"
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
                  if (day === null) {
                    return (
                      <div
                        key={di}
                        style={{ width: CELL, height: CELL, flexShrink: 0 }}
                      />
                    );
                  }

                  const isFuture = day.date > today;
                  const isToday = day.date === today;
                  const level = getIntensityLevel(day.tokens, maxTokens);

                  // ── Future cell ──
                  if (isFuture) {
                    return (
                      <div
                        key={di}
                        className="future-cell"
                        style={{
                          width: CELL,
                          height: CELL,
                          borderRadius: 2,
                          background: "rgba(244, 160, 85, 0.05)",
                          border: "1px dashed rgba(217, 98, 42, 0.22)",
                          boxSizing: "border-box",
                          flexShrink: 0,
                          cursor: "default",
                        }}
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

                  // ── Today cell ──
                  if (isToday) {
                    const todayBg = level > 0 ? INTENSITY_COLORS[level] : "rgba(244, 160, 85, 0.16)";
                    return (
                      <div
                        key={di}
                        ref={todayCellRef}
                        className="today-cell"
                        style={{
                          width: CELL,
                          height: CELL,
                          borderRadius: 2,
                          backgroundColor: todayBg,
                          border: "1.5px solid #d9622a",
                          boxSizing: "border-box",
                          flexShrink: 0,
                          cursor: "pointer",
                          transition: "transform 0.1s",
                          position: "relative",
                        }}
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
                  }

                  // ── Past cell ──
                  const bg = INTENSITY_COLORS[level];
                  const isEmpty = level === 0;
                  return (
                    <div
                      key={di}
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

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 ml-8 flex-wrap">
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

        {/* Separator */}
        <div style={{ width: 1, height: 12, background: "#ecdccc", margin: "0 4px" }} />

        {/* Today legend */}
        <div
          className="today-cell"
          style={{
            width: CELL,
            height: CELL,
            borderRadius: 2,
            background: "rgba(244, 160, 85, 0.16)",
            border: "1.5px solid #d9622a",
            boxSizing: "border-box",
          }}
        />
        <span style={{ fontSize: 10, color: "#9a8070" }}>오늘</span>

        {/* Future legend */}
        <div
          style={{
            width: CELL,
            height: CELL,
            borderRadius: 2,
            background: "rgba(244, 160, 85, 0.05)",
            border: "1px dashed rgba(217, 98, 42, 0.3)",
            boxSizing: "border-box",
          }}
        />
        <span style={{ fontSize: 10, color: "#9a8070" }}>예정</span>
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
            <div className="font-semibold mb-1" style={{ color: tooltip.isFuture ? "#9ca3af" : "#fdba74" }}>
              {formatDate(tooltip.data.date)}
              {tooltip.isFuture && (
                <span
                  className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(244,160,85,0.15)", color: "#fb923c", border: "1px dashed rgba(251,146,60,0.3)" }}
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
