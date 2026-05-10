import { useMemo } from 'react';
import type { DayData } from '../../../preload/index.d';
import { formatTokens, formatLocalYmd } from '../lib/formatters';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';

function extractVersion(model: string): string {
  const m = model.match(/(\d+\.\d+)/);
  return m ? m[1] : '';
}

const MODEL_COLORS: Record<string, string> = {
  opus: '#c084fc',
  sonnet: '#fb923c',
  haiku: '#34d399',
};

function getModelFamily(model: string): string | null {
  if (model.includes('opus')) return 'opus';
  if (model.includes('sonnet')) return 'sonnet';
  if (model.includes('haiku')) return 'haiku';
  return null;
}

function shortModelName(model: string): string {
  const family = getModelFamily(model);
  if (!family) return model;
  return `${family[0].toUpperCase()}${family.slice(1)} ${extractVersion(model)}`;
}

function modelColor(model: string): string {
  const family = getModelFamily(model);
  return family ? MODEL_COLORS[family] : '#94a3b8';
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  subGrid?: { label: string; value: string }[];
  color?: string;
  icon: string;
  badge?: { text: string; positive: boolean } | null;
  compact?: boolean;
}

function StatCard({ label, value, sub, subGrid, color = '#c2410c', icon, badge, compact }: StatCardProps) {
  return (
    <Card className="rounded-xl bg-white shadow-sm">
      <CardContent className={`flex flex-col gap-1.5 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center gap-2">
          <span className={compact ? 'text-base' : 'text-lg'}>{icon}</span>
          <span className="text-xs font-medium uppercase tracking-wide text-[#5c4030]">
            {label}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <div className={`font-mono font-bold ${compact ? 'text-xl' : 'text-2xl'}`} style={{ color }}>
            {value}
          </div>
          {badge && (
            <Badge
              variant={badge.positive ? 'success' : 'muted'}
              className="text-[11px] px-1.5 py-0.5"
            >
              {badge.positive ? '▲' : '▼'} {badge.text}
            </Badge>
          )}
        </div>
        {sub && <div className="text-xs text-[#6b5344]">{sub}</div>}
        {subGrid && (
          <div className="grid grid-cols-2 gap-x-2 text-xs">
            {subGrid.map(({ label: lbl, value: val }) => (
              <div key={lbl}>
                <div className="text-[10px] text-[#9a7060]">{lbl}</div>
                <div className="font-mono font-semibold text-[#3d2918]">{val}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface Props {
  data: DayData[];
  allDays?: DayData[];
  today: string;
}

export default function StatsPanel({ data, allDays = [], today }: Props) {
  const {
    totalTokens,
    activeDays,
    todaySessions,
    todayTokens,
    peak,
    peakDate,
    streak,
    thisMonthTokens,
    streakStartLabel,
  } = useMemo(() => {
    const totalTokens = data.reduce((s, d) => s + d.tokens, 0);
    const activeDays = data.filter((d) => d.tokens > 0).length;
    const ym = today.slice(0, 7);
    const thisMonthTokens = data
      .filter((d) => d.date.startsWith(ym))
      .reduce((s, d) => s + d.tokens, 0);

    const todayData = data.find((d) => d.date === today);
    const todaySessions = todayData?.sessions ?? 0;
    const todayTokens = todayData?.tokens ?? 0;

    const peak = data.reduce(
      (best, d) => (d.tokens > (best?.tokens ?? 0) ? d : best),
      data[0] ?? null,
    );
    const peakDate = peak
      ? new Date(peak.date + 'T00:00:00').toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
        })
      : '-';

    // 현재 스트릭 — 오늘 아직 사용이 없어도 어제까지의 연속일수를 유지
    let streak = 0;
    const lastIdx = data.length - 1;
    const todayHasTokens = lastIdx >= 0 && data[lastIdx].tokens > 0;
    const startIdx = todayHasTokens ? lastIdx : lastIdx - 1;
    for (let i = startIdx; i >= 0; i--) {
      if (data[i].tokens > 0) streak++;
      else break;
    }

    // streak 시작일 계산
    let streakStartLabel = '';
    if (streak > 0) {
      const streakEnd = new Date(today + 'T00:00:00');
      if (!todayHasTokens) streakEnd.setDate(streakEnd.getDate() - 1);
      streakEnd.setDate(streakEnd.getDate() - (streak - 1));
      streakStartLabel = streakEnd.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    }

    return {
      totalTokens,
      activeDays,
      todaySessions,
      todayTokens,
      peak,
      peakDate,
      streak,
      thisMonthTokens,
      streakStartLabel,
    };
  }, [data, today]);

  // 역대 최장 스트릭
  const longestStreak = useMemo(() => {
    let max = 0;
    let temp = 0;
    for (const d of data) {
      if (d.tokens > 0) {
        temp++;
        max = Math.max(max, temp);
      } else temp = 0;
    }
    return max;
  }, [data]);

  // 주간 증감률: 이번 주 7일 vs 지난 주 7일 (allDays 기준으로 탭 전환과 무관하게 일관)
  const weekGrowth = useMemo(() => {
    if (allDays.length === 0) return null;
    const map = new Map(allDays.map((d) => [d.date, d]));
    let thisWeek = 0;
    let lastWeek = 0;
    for (let i = 0; i < 7; i++) {
      const d1 = new Date(today + 'T00:00:00');
      d1.setDate(d1.getDate() - i);
      thisWeek += map.get(formatLocalYmd(d1))?.tokens ?? 0;
      const d2 = new Date(today + 'T00:00:00');
      d2.setDate(d2.getDate() - 7 - i);
      lastWeek += map.get(formatLocalYmd(d2))?.tokens ?? 0;
    }
    if (lastWeek === 0) return null;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  }, [allDays, today]);

  // 모델별 합산
  const modelTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of data) {
      for (const [model, tokens] of Object.entries(day.modelBreakdown)) {
        map.set(model, (map.get(model) ?? 0) + tokens);
      }
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([model, tokens]) => ({ model, tokens }));
  }, [data]);

  const topModel = modelTotals[0];

  return (
    <div className="space-y-3">
      {/* 4-card grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon="🔥"
          label="연속 사용일"
          value={`${streak}일`}
          sub={
            streak === 0
              ? '아직 사용 없음'
              : longestStreak > streak
                ? `역대 최고 ${longestStreak}일`
                : `${streakStartLabel}부터 연속`
          }
          color="#c2410c"
        />
        <StatCard
          icon="📊"
          label="올해 누적"
          value={formatTokens(totalTokens)}
          subGrid={
            activeDays > 0
              ? [
                  { label: '일평균', value: formatTokens(Math.round(totalTokens / activeDays)) },
                  { label: '이번달', value: formatTokens(thisMonthTokens) },
                ]
              : undefined
          }
          sub={activeDays === 0 ? '데이터 없음' : undefined}
          color="#c2410c"
          badge={
            weekGrowth !== null
              ? { text: `${Math.abs(weekGrowth)}% 전주 대비`, positive: weekGrowth >= 0 }
              : null
          }
        />
        <StatCard
          icon="💬"
          label="오늘 세션"
          value={todayTokens > 0 ? formatTokens(todayTokens) : '없음'}
          sub={todayTokens > 0 ? `세션 ${todaySessions}회` : '오늘 사용 없음'}
          color="#6d28d9"
        />
        <StatCard
          icon="🏆"
          label="주력 모델"
          value={topModel ? shortModelName(topModel.model) : '-'}
          sub={topModel ? formatTokens(topModel.tokens) : '데이터 없음'}
          color={topModel ? modelColor(topModel.model) : '#94a3b8'}
        />
      </div>

      {/* 모델별 사용량 */}
      {modelTotals.length > 0 && (
        <Card className="rounded-xl bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <span className="text-xs font-medium uppercase tracking-wide text-[#5c4030]">
                모델별 사용량
              </span>
            </div>
            <div className="space-y-2.5">
              {modelTotals.map(({ model, tokens }) => {
                const pct = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;
                const color = modelColor(model);
                return (
                  <div key={model}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-[#3d2918]">
                        {shortModelName(model)}
                      </span>
                      <span className="font-mono text-xs text-[#6b5344]">
                        {formatTokens(tokens)}{' '}
                        <span className="text-[#b0907a]">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <Progress
                      className="h-2 bg-[#f0e4d8] border-transparent"
                      value={pct}
                      indicatorStyle={{ backgroundColor: color }}
                    />
                  </div>
                );
              })}
            </div>

            {peak && (
              <>
                <Separator className="mt-3 bg-[#ecdccc]" />
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-[#6b5344]">
                    📈 최고 사용일
                    <span className="ml-1.5 font-semibold text-[#3d2918]">{peakDate}</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#c2410c]">
                    {formatTokens(peak.tokens)}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
