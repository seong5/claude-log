import { useCallback, useEffect, useMemo, useState } from "react";
import TokenHeatmap, { type DayData } from "./components/TokenHeatmap";
import StatsPanel from "./components/StatsPanel";
import UsagePanel from "./components/UsagePanel";
import { useLogStore } from "./store/useLogStore";
import { useUsageEstimator } from "./hooks/useUsageEstimator";
import type { OAuthUsageData, SessionData } from "../../preload/index.d";

/** 히트맵 고정 구간: 2026-01-01 ~ 2026-06-30 */
const HEATMAP_START = new Date("2026-01-01T00:00:00");
const HEATMAP_END = new Date(2026, 6, 0); // Jun 30

const formatTokensShort = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
};

/** 로컬 달력 기준 YYYY-MM-DD (toISOString UTC 시프트로 12월/1월 레이블이 겹치는 문제 방지) */
function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function App(): React.JSX.Element {
  const { days: allDays, loading, init } = useLogStore();
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [recentFiveHourTokens, setRecentFiveHourTokens] = useState(0);
  const [oldestRecentEntryTime, setOldestRecentEntryTime] = useState<number | null>(null);
  const [oauthUsage, setOAuthUsage] = useState<OAuthUsageData | null>(null);
  const [oauthUsageLoading, setOAuthUsageLoading] = useState(false);
  const [oauthUsageError, setOAuthUsageError] = useState<string | null>(null);
  const sessionTokens = currentSession?.tokens ?? 0;
  const currentBlockTokens = currentSession?.blockTokens ?? 0;
  const blockStartedAt = currentSession?.blockStartTimestamp
    ? Date.parse(currentSession.blockStartTimestamp)
    : Date.now();
  // 슬라이딩 윈도우 기반 리셋 시간: 가장 오래된 항목 + 5시간
  const FIVE_HOUR_MS = 5 * 60 * 60 * 1000;
  const blockEndsAt = oldestRecentEntryTime
    ? oldestRecentEntryTime + FIVE_HOUR_MS
    : Date.now() + FIVE_HOUR_MS;
  const usageEstimator = useUsageEstimator(recentFiveHourTokens, blockStartedAt, blockEndsAt);
  const handleCaptureLimit = (): void => {
    if (recentFiveHourTokens <= 0) return;
    usageEstimator.setManualLimit(recentFiveHourTokens);
  };

  const fetchOAuthUsage = useCallback((): Promise<void> => {
    setOAuthUsageLoading(true);
    setOAuthUsageError(null);
    return window.claudeLog
      .getOAuthUsage()
      .then((data) => setOAuthUsage(data))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "OAuth usage 조회에 실패했습니다.";
        setOAuthUsageError(message);
      })
      .finally(() => setOAuthUsageLoading(false));
  }, []);

  useEffect(() => {
    init();
    window.claudeLog.getCurrentSession().then(setCurrentSession);
    window.claudeLog.getRecentFiveHourTokens().then(setRecentFiveHourTokens);
    window.claudeLog.getOldestRecentEntryTime().then(setOldestRecentEntryTime);
    void fetchOAuthUsage();
    const unsub = window.claudeLog.onUpdate(() => {
      window.claudeLog.getCurrentSession().then(setCurrentSession);
      window.claudeLog.getRecentFiveHourTokens().then(setRecentFiveHourTokens);
      window.claudeLog.getOldestRecentEntryTime().then(setOldestRecentEntryTime);
    });
    return () => {
      useLogStore.getState().destroy();
      unsub();
    };
  }, [fetchOAuthUsage, init]);

  const [today, setToday] = useState(() => formatLocalYmd(new Date()));

  useEffect(() => {
    const checkDate = (): void => {
      const current = formatLocalYmd(new Date());
      setToday((prev) => (prev !== current ? current : prev));
    };
    const id = setInterval(checkDate, 60_000);
    document.addEventListener("visibilitychange", checkDate);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", checkDate);
    };
  }, []);

  // 히트맵: 2026-01-01 ~ 2026-06-30 고정
  const heatmapData = useMemo<DayData[]>(() => {
    if (allDays.length === 0) return [];
    const dataMap = new Map(allDays.map((d) => [d.date, d]));
    const result: DayData[] = [];
    const cur = new Date(HEATMAP_START);
    while (cur <= HEATMAP_END) {
      const ds = formatLocalYmd(cur);
      result.push(
        dataMap.get(ds) ?? {
          date: ds,
          tokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          sessions: 0,
          modelBreakdown: {},
        },
      );
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [allDays]);

  // Stats data: only past + today (no future empty days)
  const filteredData = useMemo<DayData[]>(
    () => heatmapData.filter((d) => d.date <= today),
    [heatmapData, today],
  );

  const totalThisMonth = useMemo(() => {
    const ym = today.slice(0, 7);
    return allDays.filter((d) => d.date.startsWith(ym)).reduce((s, d) => s + d.tokens, 0);
  }, [allDays, today]);

  const last7Days = useMemo(() => {
    const dataMap = new Map(allDays.map((d) => [d.date, d]));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today + "T00:00:00");
      d.setDate(d.getDate() - i);
      const ds = formatLocalYmd(d);
      return (
        dataMap.get(ds) ?? {
          date: ds,
          tokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          sessions: 0,
          modelBreakdown: {},
        }
      );
    });
  }, [allDays, today]);
  const maxLast7 = useMemo(() => Math.max(...last7Days.map((d) => d.tokens), 1), [last7Days]);

  const thisWeekTokens = useMemo(() => {
    const map = new Map(allDays.map((d) => [d.date, d]));
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today + "T00:00:00");
      d.setDate(d.getDate() - i);
      sum += map.get(formatLocalYmd(d))?.tokens ?? 0;
    }
    return sum;
  }, [allDays, today]);

  return (
    <div
      className="h-screen overflow-auto"
      style={{
        backgroundColor: "#fdf6ec",
        fontFamily: "'Nunito', system-ui, sans-serif",
        color: "#4a2e1a",
        backgroundImage: `radial-gradient(ellipse at 20% 0%, rgba(244, 160, 85, 0.08) 0%, transparent 60%),
                          radial-gradient(ellipse at 80% 10%, rgba(217, 98, 42, 0.06) 0%, transparent 50%)`,
      }}
    >
      {/* Top Navigation */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-2"
        style={{
          backgroundColor: "rgba(253, 246, 236, 0.88)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid #ecdccc",
          boxShadow: "0 1px 12px rgba(180, 100, 50, 0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center mascot-float overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(217, 98, 42, 0.25)" }}
          >
            <img
              src="../../resources/icon.png"
              alt="Claude Log"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.style.background = "linear-gradient(135deg, #f4a055, #d9622a)";
                  parent.innerHTML = '<span style="font-size:16px">🐙</span>';
                }
              }}
            />
          </div>
          <span
            className="font-bold text-sm"
            style={{ color: "#4a2e1a", letterSpacing: "-0.01em" }}
          >
            Claude Log
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: "#fde8d5", color: "#d9622a", border: "1px solid #f4c4a0" }}
          >
            Beta
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "#f0faf2", border: "1px solid #c0e8cc" }}
          >
            <span
              className="live-dot inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: "#6daa7c" }}
            />
            <span style={{ color: "#4a8c5c", fontWeight: 600 }}>실시간 추적 중</span>
          </div>
          <div
            className="px-3 py-1.5 rounded-xl"
            style={{
              backgroundColor: "#fde8d5",
              border: "1px solid #f4c4a0",
              color: "#8c6248",
            }}
          >
            현재 세션{" "}
            <span className="font-mono font-bold ml-1" style={{ color: "#d9622a" }}>
              {Math.round(oauthUsage?.sessionUsagePercent ?? 0)}%
            </span>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Hero section */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-xl font-extrabold mb-0.5"
              style={{ color: "#3a2010", letterSpacing: "-0.02em" }}
            >
              토큰 사용량 ✨
            </h1>
            <p className="text-xs font-medium" style={{ color: "#9a7060" }}>
              Claude Code 세션의 일별 토큰 소비량을 추적합니다
            </p>
          </div>
          <div
            className="flex gap-3 px-3 py-2 rounded-2xl text-xs"
            style={{ backgroundColor: "#f5ebe0", border: "1px solid #ecdccc" }}
          >
            <div className="text-right">
              <div className="font-semibold" style={{ color: "#9a7060" }}>이번 달</div>
              <div className="font-mono font-bold" style={{ color: "#d9622a" }}>
                {formatTokensShort(totalThisMonth)}
              </div>
            </div>
            <div style={{ borderLeft: "1px solid #ecdccc" }} />
            <div className="text-right">
              <div className="font-semibold" style={{ color: "#9a7060" }}>최근 7일</div>
              <div className="font-mono font-bold" style={{ color: "#d9622a" }}>
                {formatTokensShort(thisWeekTokens)}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div
            className="rounded-3xl p-12 flex items-center justify-center"
            style={{
              backgroundColor: "#fffcf8",
              border: "1px solid #ecdccc",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "#c0a090" }}>
              JSONL 파일 파싱 중…
            </p>
          </div>
        ) : (
          <>
            {/* Usage Panel */}
            <UsagePanel
              usage={oauthUsage}
              usageLoading={oauthUsageLoading}
              usageError={oauthUsageError}
              onRefreshUsage={fetchOAuthUsage}
            />

            {/* Heatmap Card */}
            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: "#fffcf8",
                border: "1px solid #ecdccc",
                boxShadow: "0 2px 16px rgba(180, 100, 50, 0.07)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-extrabold text-sm" style={{ color: "#3a2010" }}>
                    🗓 활동 히트맵
                  </h2>
                  <p className="text-xs font-medium mt-0.5" style={{ color: "#9a7060" }}>
                    2026년 1월 ~ 6월 토큰 사용 기록
                  </p>
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: "#fde8d5", border: "1px solid #f4c4a0" }}
                >
                  <span className="text-sm">🔥</span>
                  <span className="font-bold text-sm" style={{ color: "#d9622a" }}>
                    {filteredData.filter((d) => d.tokens > 0).length}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "#c07050" }}>
                    일 활성
                  </span>
                </div>
              </div>
              <TokenHeatmap data={heatmapData} today={today} />
            </div>

            {/* Stats */}
            <div>
              <h2 className="font-extrabold text-sm mb-2" style={{ color: "#3a2010" }}>
                📊 요약 통계
              </h2>
              <StatsPanel data={filteredData} allDays={allDays} />
            </div>

            {/* Recent activity */}
            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: "#fffcf8",
                border: "1px solid #ecdccc",
                boxShadow: "0 2px 16px rgba(180, 100, 50, 0.07)",
              }}
            >
              <h2 className="font-extrabold text-sm mb-3" style={{ color: "#3a2010" }}>
                📅 최근 7일 활동
              </h2>
              <div className="space-y-2.5">
                {last7Days.map((day) => {
                  const date = new Date(day.date + "T00:00:00");
                  const isToday = day.date === today;
                  const pct = (day.tokens / maxLast7) * 100;
                  return (
                    <div key={day.date} className="flex items-center gap-3">
                      <div
                        className="text-xs font-bold w-24 shrink-0 flex items-center gap-1.5"
                        style={{ color: "#9a7060" }}
                      >
                        {isToday ? (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{
                              backgroundColor: "#fde8d5",
                              color: "#d9622a",
                              border: "1px solid #f4c4a0",
                            }}
                          >
                            오늘
                          </span>
                        ) : (
                          date.toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            weekday: "short",
                          })
                        )}
                      </div>
                      <div
                        className="flex-1 h-6 rounded-full overflow-hidden"
                        style={{ backgroundColor: "#f5ebe0" }}
                      >
                        {day.tokens > 0 && (
                          <div
                            className="h-full rounded-full flex items-center px-3 transition-all duration-500"
                            style={{
                              width: `${Math.max(pct, 5)}%`,
                              background: "linear-gradient(to right, #f4a055, #d9622a)",
                            }}
                          >
                            <span
                              className="text-[10px] font-bold font-mono whitespace-nowrap overflow-hidden"
                              style={{ color: "#fff8f4" }}
                            >
                              {pct > 30 ? formatTokensShort(day.tokens) : ""}
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        className="text-xs font-mono font-bold w-16 text-right shrink-0"
                        style={{ color: day.tokens > 0 ? "#9a7060" : "#d4b8a4" }}
                      >
                        {day.tokens > 0 ? formatTokensShort(day.tokens) : "—"}
                      </div>
                      <div
                        className="text-xs font-semibold w-10 text-right shrink-0"
                        style={{ color: "#c0a090" }}
                      >
                        {day.sessions > 0 ? `${day.sessions}회` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>


    </div>
  );
}
