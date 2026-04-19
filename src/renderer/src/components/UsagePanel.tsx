import { useEffect, useState } from "react";

interface UsagePanelProps {
  currentSessionTokens: number;
  currentBlockTokens: number;
  recentFiveHourTokens: number;
  estimatedLimit: number;
  usagePct: number;
  blockEndsAt: number;
  onCaptureLimit: () => void;
}

function formatTokensFull(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getSessionResetLabel(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}시간 ${m}분 후 초기화`;
}

function getBarColor(pct: number): string {
  if (pct >= 90) return "#ef4444";
  if (pct >= 70) return "#f59e0b";
  return "#d9622a";
}

function getBarBg(pct: number): string {
  if (pct >= 90) return "linear-gradient(90deg, #fca5a5 0%, #ef4444 100%)";
  if (pct >= 70) return "linear-gradient(90deg, #fcd34d 0%, #f59e0b 100%)";
  return "linear-gradient(90deg, #f4a055 0%, #d9622a 100%)";
}

function formatHm(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function ceilToMinute(ts: number): number {
  return Math.ceil(ts / 60_000) * 60_000;
}

function floorToMinute(ts: number): number {
  return Math.floor(ts / 60_000) * 60_000;
}

function getNextFiveHourBoundary(ts: number): number {
  const d = new Date(ts);
  d.setSeconds(0, 0);
  const hour = d.getHours();
  const nextHour = (Math.floor(hour / 5) + 1) * 5;
  if (nextHour >= 24) {
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  d.setHours(nextHour, 0, 0, 0);
  return d.getTime();
}

interface UsageRowProps {
  label: string;
  subLabel: string;
  tokens: number;
  limit: number | null;
  animDelay: number;
  showPercentage: boolean;
  forcedPct?: number;
  infoText?: string;
  onInfoClick?: () => void;
}

function UsageRow({
  label,
  subLabel,
  tokens,
  limit,
  animDelay,
  showPercentage,
  forcedPct,
  infoText,
  onInfoClick,
}: UsageRowProps) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFilled(true), animDelay + 100);
    return () => clearTimeout(t);
  }, [animDelay]);

  const pct =
    typeof forcedPct === "number"
      ? Math.max(0, Math.min(forcedPct, 100))
      : limit
        ? Math.min((tokens / limit) * 100, 100)
        : 0;
  const displayPct = Math.round(pct);
  const fillWidth = filled ? `${Math.max(pct > 0 ? 1.5 : 0, pct)}%` : "0%";
  const barColor = getBarColor(pct);
  const barBg = getBarBg(pct);

  return (
    <div className="flex items-center gap-4">
      {/* Left: label + sublabel */}
      <div className="w-40 shrink-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold" style={{ color: "#3a2010" }}>
            {label}
          </p>
          {infoText ? (
            <button
              type="button"
              onClick={onInfoClick}
              title={onInfoClick ? undefined : infoText}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold select-none"
              style={{
                backgroundColor: "#f5ebe0",
                border: "1px solid #e2cbb8",
                color: "#a26f4f",
                cursor: onInfoClick ? "pointer" : "help",
              }}
            >
              ?
            </button>
          ) : null}
        </div>
        <p className="text-xs mt-0.5" style={{ color: "#a08060" }}>
          {subLabel}
        </p>
      </div>

      {/* Center: progress bar */}
      <div className="flex-1">
        <div
          className="w-full rounded-full overflow-hidden"
          style={{
            height: "8px",
            backgroundColor: "#ede4d8",
            boxShadow: "inset 0 1px 3px rgba(100,50,20,0.12)",
          }}
        >
          {limit ? (
            <div
              className="h-full rounded-full"
              style={{
                width: fillWidth,
                background: barBg,
                boxShadow: pct > 2 ? `0 0 8px rgba(217,98,42,0.4)` : "none",
                transition: `width 1.1s cubic-bezier(0.22,1,0.36,1) ${animDelay}ms`,
              }}
            />
          ) : (
            <div
              className="h-full w-full rounded-full"
              style={{
                background:
                  "repeating-linear-gradient(90deg,#e8ddd2 0px,#ddd3c7 10px,#e8ddd2 20px)",
                opacity: 0.7,
              }}
            />
          )}
        </div>
      </div>

      {/* Right: percentage or token count */}
      <div className="w-24 shrink-0 text-right">
        {showPercentage && limit ? (
          <span className="text-sm font-bold font-mono" style={{ color: barColor }}>
            {displayPct}% 사용
          </span>
        ) : (
          <span className="text-sm font-mono font-semibold" style={{ color: "#b89070" }}>
            {formatTokensFull(tokens)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function UsagePanel({
  currentSessionTokens,
  currentBlockTokens,
  recentFiveHourTokens,
  estimatedLimit,
  usagePct,
  blockEndsAt,
  onCaptureLimit,
}: UsagePanelProps) {
  const [lastUpdated, setLastUpdated] = useState("방금 전");
  const [blockResetLabel, setBlockResetLabel] = useState("계산 중...");
  const [showWindowGuide, setShowWindowGuide] = useState(false);
  const displayWindowEnd = getNextFiveHourBoundary(Date.now());
  const displayWindowStart = displayWindowEnd - 5 * 60 * 60 * 1000;
  const windowRangeLabel = `${formatHm(displayWindowStart)}~${formatHm(displayWindowEnd)}`;

  useEffect(() => {
    setLastUpdated("방금 전");
    const t = setInterval(() => {
      setLastUpdated((prev) => {
        const match = prev.match(/^(\d+)분 전$/);
        if (match) return `${parseInt(match[1]) + 1}분 전`;
        if (prev === "방금 전") return "1분 전";
        return prev;
      });
    }, 60_000);
    return () => clearInterval(t);
  }, [usagePct, currentSessionTokens]);

  useEffect(() => {
    const updateLabel = (): void => {
      const now = Date.now();
      const diff = Math.max(blockEndsAt - now, 0);
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setBlockResetLabel(`${h}시간 ${m}분 후 초기화`);
    };
    updateLabel();
    const t = setInterval(updateLabel, 30_000);
    return () => clearInterval(t);
  }, [blockEndsAt]);

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "#fffcf8",
        border: "1px solid #e8d8c8",
        boxShadow: "0 2px 20px rgba(160,80,30,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-extrabold text-sm" style={{ color: "#3a2010" }}>
          ⚡ 사용량 한도
        </h2>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: "#fde8d5",
            border: "1px solid #f4c4a0",
            color: "#c06030",
          }}
        >
          Pro
        </span>
      </div>

      <div className="space-y-4">
        {/* Current session in 5-hour sliding window */}
        <UsageRow
          label="현재 세션"
          subLabel={`예상 한도 : ${formatTokensFull(estimatedLimit)}`}
          tokens={recentFiveHourTokens}
          limit={estimatedLimit}
          animDelay={0}
          showPercentage={true}
          infoText={`최근 5시간 슬라이딩 윈도우 기준: ${windowRangeLabel}`}
          onInfoClick={() => setShowWindowGuide((prev) => !prev)}
        />
        {showWindowGuide ? (
          <div
            className="text-xs px-3 py-2 rounded-xl"
            style={{ backgroundColor: "#fff4ea", border: "1px solid #f4c4a0", color: "#9a5d3d" }}
          >
            현재 슬라이딩 윈도우: {windowRangeLabel}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCaptureLimit}
            disabled={recentFiveHourTokens <= 0}
            className="text-xs font-bold px-3 py-1.5 rounded-xl transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: "#fde8d5",
              border: "1px solid #f4c4a0",
              color: "#c06030",
            }}
          >
            지금 값을 한도로 설정
          </button>
        </div>

        <div style={{ borderTop: "1px solid #ede4d8" }} />

        {/* Session absolute token count */}
        <div className="mb-1">
          <p className="text-sm font-extrabold" style={{ color: "#3a2010" }}>
            세션 토큰
          </p>
        </div>

        <UsageRow
          label="현재 세션"
          subLabel={getSessionResetLabel()}
          tokens={currentSessionTokens}
          limit={null}
          animDelay={300}
          showPercentage={false}
        />
      </div>

      {/* Footer: last updated */}
      <div
        className="flex items-center gap-1.5 mt-5 pt-4"
        style={{ borderTop: "1px solid #ede4d8" }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#c4a894"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 4v6h-6" />
          <path d="M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        <span className="text-[10px] font-medium" style={{ color: "#c4a894" }}>
          마지막 업데이트: {lastUpdated}
        </span>
      </div>
    </div>
  );
}
