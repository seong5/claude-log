import { useMemo } from 'react'
import type { DayData } from '../../../preload/index.d'
import { formatTokens, formatLocalYmd } from '../lib/formatters'

function shortModelName(model: string): string {
  if (model.includes('opus')) return `Opus ${extractVersion(model)}`
  if (model.includes('sonnet')) return `Sonnet ${extractVersion(model)}`
  if (model.includes('haiku')) return `Haiku ${extractVersion(model)}`
  return model
}

function extractVersion(model: string): string {
  const m = model.match(/(\d+\.\d+)/)
  return m ? m[1] : ''
}

const MODEL_COLORS: Record<string, string> = {
  opus: '#c084fc',
  sonnet: '#fb923c',
  haiku: '#34d399',
}

function modelColor(model: string): string {
  if (model.includes('opus')) return MODEL_COLORS.opus
  if (model.includes('sonnet')) return MODEL_COLORS.sonnet
  if (model.includes('haiku')) return MODEL_COLORS.haiku
  return '#94a3b8'
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  color?: string
  icon: string
  badge?: { text: string; positive: boolean } | null
}

function StatCard({ label, value, sub, color = '#c2410c', icon, badge }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#ecdccc] bg-white p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-[#5c4030]">{label}</span>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <div className="font-mono font-bold text-2xl" style={{ color }}>
          {value}
        </div>
        {badge && (
          <span
            className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: badge.positive ? '#f0faf2' : '#fff0f0',
              color: badge.positive ? '#2f8f57' : '#c53030',
              border: `1px solid ${badge.positive ? '#bfe7cd' : '#f5b3bb'}`,
            }}
          >
            {badge.positive ? '▲' : '▼'} {badge.text}
          </span>
        )}
      </div>
      {sub && <div className="text-xs text-[#6b5344]">{sub}</div>}
    </div>
  )
}

interface Props {
  data: DayData[]
  allDays?: DayData[]
}

export default function StatsPanel({ data, allDays = [] }: Props) {
  const totalTokens = data.reduce((s, d) => s + d.tokens, 0)
  const activeDays = data.filter((d) => d.tokens > 0).length

  const todayStr = formatLocalYmd(new Date())
  const todayData = data.find((d) => d.date === todayStr)
  const todaySessions = todayData?.sessions ?? 0
  const todayTokens = todayData?.tokens ?? 0

  const peak = data.reduce(
    (best, d) => (d.tokens > (best?.tokens ?? 0) ? d : best),
    data[0] ?? null
  )
  const peakDate = peak
    ? new Date(peak.date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : '-'

  // 현재 스트릭 — 오늘 아직 사용이 없어도 어제까지의 연속일수를 유지
  let streak = 0
  const lastIdx = data.length - 1
  const startIdx = lastIdx >= 0 && data[lastIdx].tokens === 0 ? lastIdx - 1 : lastIdx
  for (let i = startIdx; i >= 0; i--) {
    if (data[i].tokens > 0) streak++
    else break
  }

  // 역대 최장 스트릭
  const longestStreak = useMemo(() => {
    let max = 0
    let temp = 0
    for (const d of data) {
      if (d.tokens > 0) { temp++; max = Math.max(max, temp) }
      else temp = 0
    }
    return max
  }, [data])

  // 주간 증감률: 이번 주 7일 vs 지난 주 7일 (allDays 기준으로 탭 전환과 무관하게 일관)
  const weekGrowth = useMemo(() => {
    if (allDays.length === 0) return null
    const todayStr = formatLocalYmd(new Date())
    const map = new Map(allDays.map((d) => [d.date, d]))
    let thisWeek = 0
    let lastWeek = 0
    for (let i = 0; i < 7; i++) {
      const d1 = new Date(todayStr + 'T00:00:00')
      d1.setDate(d1.getDate() - i)
      thisWeek += map.get(formatLocalYmd(d1))?.tokens ?? 0
      const d2 = new Date(todayStr + 'T00:00:00')
      d2.setDate(d2.getDate() - 7 - i)
      lastWeek += map.get(formatLocalYmd(d2))?.tokens ?? 0
    }
    if (lastWeek === 0) return null
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
  }, [allDays])

  // 모델별 합산
  const modelTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const day of data) {
      for (const [model, tokens] of Object.entries(day.modelBreakdown)) {
        map.set(model, (map.get(model) ?? 0) + tokens)
      }
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([model, tokens]) => ({ model, tokens }))
  }, [data])

  const topModel = modelTotals[0]

  return (
    <div className="space-y-3">
      {/* 4-card grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon="🔥"
          label="연속 사용일"
          value={`${streak}일`}
          sub={longestStreak > streak ? `역대 최고 ${longestStreak}일` : '현재가 최고 기록!'}
          color="#c2410c"
        />
        <StatCard
          icon="📊"
          label="올해 누적"
          value={formatTokens(totalTokens)}
          sub={`활성일 ${activeDays}일`}
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
          value={`${todaySessions}회`}
          sub={todayTokens > 0 ? `오늘 ${formatTokens(todayTokens)} 사용` : '오늘 사용 없음'}
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
        <div className="rounded-xl border border-[#ecdccc] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <span className="text-xs font-medium uppercase tracking-wide text-[#5c4030]">모델별 사용량</span>
          </div>
          <div className="space-y-2.5">
            {modelTotals.map(({ model, tokens }) => {
              const pct = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0
              const color = modelColor(model)
              return (
                <div key={model}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-semibold text-[#3d2918]">
                      {shortModelName(model)}
                    </span>
                    <span className="font-mono text-xs text-[#6b5344]">
                      {formatTokens(tokens)}{' '}
                      <span className="text-[#b0907a]">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f0e4d8]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {peak && (
            <div className="mt-3 pt-3 border-t border-[#ecdccc] flex justify-between items-center">
              <div className="text-xs text-[#6b5344]">
                📈 최고 사용일
                <span className="ml-1.5 font-semibold text-[#3d2918]">{peakDate}</span>
              </div>
              <div className="font-mono text-xs font-bold text-[#c2410c]">
                {formatTokens(peak.tokens)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
