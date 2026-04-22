import { useCallback, useEffect, useState } from "react";
import TokenHeatmap from "./components/TokenHeatmap";
import StatsPanel from "./components/StatsPanel";
import UsagePanel from "./components/UsagePanel";
import RecentActivity from "./components/RecentActivity";
import { Badge } from "./components/ui/badge";
import { Card, CardContent } from "./components/ui/card";
import { Separator } from "./components/ui/separator";
import { useLogStore } from "./store/useLogStore";
import { useUsageEstimator } from "./hooks/useUsageEstimator";
import { useHeatmapData } from "./hooks/useHeatmapData";
import { formatLocalYmd, formatTokensShort } from "./lib/formatters";
import type { OAuthUsageData } from "../../preload/index.d";
import mainLogo from "../../../build/main-logo.png";

export default function App(): React.JSX.Element {
  const {
    days: allDays,
    loading,
    init,
    currentSession,
    recentFiveHourTokens,
    oldestRecentEntryTime,
  } = useLogStore();

  const [oauthUsage, setOAuthUsage] = useState<OAuthUsageData | null>(null);
  const [oauthUsageLoading, setOAuthUsageLoading] = useState(false);
  const [oauthUsageError, setOAuthUsageError] = useState<string | null>(null);
  const isOAuthConnected = Boolean(oauthUsage) && !oauthUsageError;

  const blockStartedAt = currentSession?.blockStartTimestamp
    ? Date.parse(currentSession.blockStartTimestamp)
    : Date.now();
  const FIVE_HOUR_MS = 5 * 60 * 60 * 1000;
  const blockEndsAt = oldestRecentEntryTime
    ? oldestRecentEntryTime + FIVE_HOUR_MS
    : Date.now() + FIVE_HOUR_MS;
  const usageEstimator = useUsageEstimator(recentFiveHourTokens, blockStartedAt, blockEndsAt);
  const handleCaptureLimit = (): void => {
    if (recentFiveHourTokens <= 0) return;
    usageEstimator.setManualLimit(recentFiveHourTokens);
  };
  void handleCaptureLimit;

  const fetchOAuthUsage = useCallback(async (): Promise<void> => {
    setOAuthUsageLoading(true);
    setOAuthUsageError(null);
    try {
      const data = await window.claudeLog.getOAuthUsage();
      setOAuthUsage(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "OAuth usage 조회에 실패했습니다.";
      setOAuthUsageError(message);
    } finally {
      setOAuthUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
    void fetchOAuthUsage();
    return () => {
      useLogStore.getState().destroy();
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

  const { heatmapData, filteredData, totalThisMonth, last7Days, maxLast7, thisWeekTokens } =
    useHeatmapData(allDays, today);

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
            className="w-15 h-15 rounded-xl flex items-center justify-center overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(217, 98, 42, 0.25)" }}
          >
            <img
              src={mainLogo}
              alt="Claude Log"
              className="block w-[100%] h-[100%] object-cover"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.style.background = "linear-gradient(135deg, #f4a055, #d9622a)";
                  parent.innerHTML =
                    '<span style="font-size:14px; font-weight:700; color:#fff">CL</span>';
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
          <Badge variant="warm" className="text-xs font-semibold">
            Beta
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Badge
            variant={isOAuthConnected ? "success" : "muted"}
            className="gap-1.5 px-2.5 py-1 text-xs font-semibold"
          >
            <span
              className="live-dot inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: isOAuthConnected ? "#2f8f57" : "#c53030" }}
            />
            <span
              style={{ color: isOAuthConnected ? "#4a8c5c" : "#9a7060", fontWeight: 600 }}
            >
              {isOAuthConnected ? "연결됨" : "연결 안됨"}
            </span>
          </Badge>
          <Card className="rounded-xl border-[#f4c4a0] bg-[#fde8d5] shadow-none">
            <CardContent className="px-3 py-1.5 text-xs" style={{ color: "#8c6248" }}>
            현재 세션{" "}
            <span className="font-mono font-bold ml-1" style={{ color: "#d9622a" }}>
              {Math.round(oauthUsage?.sessionUsagePercent ?? 0)}%
            </span>
            </CardContent>
          </Card>
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
              CLAUDE-LOG ✨
            </h1>
            <p className="text-xs font-medium" style={{ color: "#9a7060" }}>
              Claude Code 세션의 토큰 소비량을 추적합니다.
            </p>
          </div>
          <Card className="rounded-2xl bg-[#f5ebe0] shadow-none">
            <CardContent className="flex gap-3 px-3 py-2 text-xs">
              <div className="text-right">
                <div className="font-semibold" style={{ color: "#9a7060" }}>
                  이번 달
                </div>
                <div className="font-mono font-bold" style={{ color: "#d9622a" }}>
                  {formatTokensShort(totalThisMonth)}
                </div>
              </div>
              <Separator orientation="vertical" className="h-auto bg-[#ecdccc]" />
              <div className="text-right">
                <div className="font-semibold" style={{ color: "#9a7060" }}>
                  최근 7일
                </div>
                <div className="font-mono font-bold" style={{ color: "#d9622a" }}>
                  {formatTokensShort(thisWeekTokens)}
                </div>
              </div>
            </CardContent>
          </Card>
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
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-extrabold text-sm" style={{ color: "#3a2010" }}>
                      🗓 활동 히트맵
                    </h2>
                    <p className="text-xs font-medium mt-0.5" style={{ color: "#9a7060" }}>
                      2026년 1월 ~ 6월 토큰 사용 기록
                    </p>
                  </div>
                  <Badge variant="warm" className="gap-1.5 px-3 py-1.5 text-xs font-semibold">
                    <span className="text-sm">🔥</span>
                    <span className="font-bold text-sm" style={{ color: "#d9622a" }}>
                      {filteredData.filter((d) => d.tokens > 0).length}
                    </span>
                    <span style={{ color: "#c07050" }}>일 활성</span>
                  </Badge>
                </div>
                <TokenHeatmap data={heatmapData} today={today} />
              </CardContent>
            </Card>

            {/* Stats */}
            <div>
              <h2 className="font-extrabold text-sm mb-2" style={{ color: "#3a2010" }}>
                📊 요약 통계
              </h2>
              <StatsPanel data={filteredData} allDays={allDays} />
            </div>

            {/* Recent activity */}
            <RecentActivity days={last7Days} today={today} maxTokens={maxLast7} />
          </>
        )}
      </main>
    </div>
  );
}
