import { useEffect, useState } from "react";
import type { OAuthUsageData } from "../../../preload/index.d";

interface UsagePanelProps {
  usage: OAuthUsageData | null;
  usageLoading: boolean;
  usageError: string | null;
  onRefreshUsage: () => Promise<void>;
}

function formatTokensFull(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface LimitRowProps {
  label: string;
  subLabel: string;
  usedPct: number;
  rightLabel: string;
  icon: string;
}

type UsageLevel = "safe" | "warn" | "danger";

function getUsageLevel(pct: number): UsageLevel {
  if (pct >= 85) return "danger";
  if (pct >= 60) return "warn";
  return "safe";
}

function LimitRow({ label, subLabel, usedPct, rightLabel, icon }: LimitRowProps) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFilled(true), 120);
    return () => clearTimeout(t);
  }, [usedPct]);

  const pct = Math.max(0, Math.min(usedPct, 100));
  const fillWidth = filled ? `${Math.max(pct > 0 ? 1.5 : 0, pct)}%` : "0%";
  const level = getUsageLevel(pct);
  const barColor =
    level === "danger"
      ? "linear-gradient(to right, #e05252, #c53030)"
      : level === "warn"
        ? "linear-gradient(to right, #f2a654, #dc8a2f)"
        : "linear-gradient(to right, #5abf8a, #3d9f6a)";
  const badgeStyle =
    level === "danger"
      ? {
          backgroundColor: "#ffe4e6",
          color: "#c53030",
          border: "1px solid #f5b3bb",
        }
      : level === "warn"
        ? {
            backgroundColor: "#fff4de",
            color: "#b26a00",
            border: "1px solid #f4d39b",
          }
        : {
            backgroundColor: "#e8f7ee",
            color: "#2f8f57",
            border: "1px solid #bfe7cd",
          };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold leading-tight" style={{ color: "#3a2010" }}>
              {label}
            </p>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: "#9a7060" }} title={subLabel}>
              {subLabel}
            </p>
          </div>
        </div>
        <span
          className="text-[12px] font-bold px-2.5 py-1 rounded-full shrink-0"
          style={badgeStyle}
        >
          {rightLabel}
        </span>
      </div>

      <div
        className="w-full rounded-full overflow-hidden"
        style={{
          height: "8px",
          backgroundColor: "#f0e4d4",
          border: "1px solid #ecdccc",
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: fillWidth,
            background: barColor,
            boxShadow: "0 1px 4px rgba(217, 98, 42, 0.3)",
            transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
    </div>
  );
}

export default function UsagePanel({
  usage,
  usageLoading,
  usageError,
  onRefreshUsage,
}: UsagePanelProps) {
  const [lastUpdated, setLastUpdated] = useState("방금 전");
  const currentSessionPct = usage?.sessionUsagePercent ?? 0;
  const h = Math.floor((usage?.sessionResetSeconds ?? 0) / 3600);
  const m = Math.floor(((usage?.sessionResetSeconds ?? 0) % 3600) / 60);
  const currentSessionSubLabel =
    usage && usage.sessionResetSeconds > 0 ? `${h}시간 ${m}분 후 초기화` : "곧 초기화";
  const weeklyAllModelsPct = usage?.weeklyAllModelsPercent ?? 0;
  const weeklyAllModelsReset = usage?.weeklyAllModelsResetLabel
    ? `${usage.weeklyAllModelsResetLabel} 초기화`
    : "주간 리셋 정보 없음";
  const weeklySonnetPct = usage?.weeklySonnetPercent ?? 0;

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
  }, [usage]);

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "#fffcf8",
        border: "1px solid #ecdccc",
        boxShadow: "0 2px 16px rgba(180, 100, 50, 0.07)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-extrabold text-sm" style={{ color: "#3a2010" }}>
            📊 플랜 사용 한도
          </h2>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{
              backgroundColor: "#fde8d5",
              color: "#d9622a",
              border: "1px solid #f4c4a0",
            }}
          >
            {usage?.planName ?? "Pro"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void onRefreshUsage()}
          disabled={usageLoading}
          className="text-[11px] font-bold px-3 py-1 rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
          style={{
            backgroundColor: "#f5ebe0",
            color: "#9a7060",
            border: "1px solid #ecdccc",
          }}
        >
          {usageLoading ? "로딩 중…" : "🔄 새로고침"}
        </button>
      </div>

      <div className="space-y-4">
        <LimitRow
          icon="⚡"
          label="현재 세션"
          subLabel={currentSessionSubLabel}
          usedPct={currentSessionPct}
          rightLabel={`${Math.round(currentSessionPct)}% 사용`}
        />

        {/* Divider */}
        <div style={{ borderTop: "1px solid #ecdccc" }} />

        {/* Weekly Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold" style={{ color: "#3a2010" }}>
              주간 한도
            </p>
          </div>
        </div>

        {/* Weekly All Models */}
        <LimitRow
          icon="🤖"
          label="전체 모델"
          subLabel={weeklyAllModelsReset}
          usedPct={weeklyAllModelsPct}
          rightLabel={`${Math.round(weeklyAllModelsPct)}% 사용`}
        />

        <LimitRow
          icon="🧠"
          label="Sonnet 전용"
          subLabel="7일 Sonnet 사용률"
          usedPct={weeklySonnetPct}
          rightLabel={`${Math.round(weeklySonnetPct)}% 사용`}
        />

        {usageError ? (
          <div
            className="text-[11px] px-3 py-2 rounded-xl font-medium"
            style={{
              backgroundColor: "#fde8d5",
              color: "#c05030",
              border: "1px solid #f4c4a0",
            }}
          >
            ⚠️ {usageError}
          </div>
        ) : (
          <div
            className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3 py-2 rounded-xl text-[11px] font-semibold"
            style={{ backgroundColor: "#f5ebe0", border: "1px solid #ecdccc" }}
          >
            <span className="min-w-0 truncate" style={{ color: "#9a7060" }} title="OAuth usage API 기반 데이터">
              OAuth usage API 기반 데이터
            </span>
            <span className="shrink-0" style={{ color: "#b89680" }}>
              {usage ? "연결됨" : "데이터 없음"}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-1.5 mt-4 pt-3"
        style={{ borderTop: "1px solid #ecdccc" }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#c0a090"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 4v6h-6" />
          <path d="M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        <span className="text-[10px] font-semibold" style={{ color: "#c0a090" }}>
          마지막 업데이트: {lastUpdated}
        </span>
      </div>
    </div>
  );
}
