import { useMemo } from 'react'
import type { DayData } from './TokenHeatmap'

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

/** claude-opus-4-6-20260114 → Opus 4.6 */
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
}

function StatCard({ label, value, sub, color = '#c2410c', icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#ecdccc] bg-white p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-[#5c4030]">{label}</span>
      </div>
      <div className="font-mono font-bold text-2xl" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-xs text-[#6b5344]">{sub}</div>}
    </div>
  )
}

interface Props {
  data: DayData[]
}

export default function StatsPanel({ data }: Props) {
  const totalTokens = data.reduce((s, d) => s + d.tokens, 0)
  const totalInput = data.reduce((s, d) => s + d.inputTokens, 0)
  const totalOutput = data.reduce((s, d) => s + d.outputTokens, 0)
  const activeDays = data.filter((d) => d.tokens > 0).length
  const totalSessions = data.reduce((s, d) => s + d.sessions, 0)

  const peak = data.reduce(
    (best, d) => (d.tokens > (best?.tokens ?? 0) ? d : best),
    data[0] ?? null
  )
  const peakDate = peak
    ? new Date(peak.date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : '-'

  // Streak — 오늘 아직 사용이 없어도 어제까지의 연속일수를 유지
  let streak = 0
  const lastIdx = data.length - 1
  const startIdx = lastIdx >= 0 && data[lastIdx].tokens === 0 ? lastIdx - 1 : lastIdx
  for (let i = startIdx; i >= 0; i--) {
    if (data[i].tokens > 0) streak++
    else break
  }

  // Aggregate model breakdown across all days in the selected period
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
      {/* 4-card row */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon="🔥"
          label="연속 사용일"
          value={`${streak}일`}
          sub="현재 스트릭"
          color="#c2410c"
        />
        <StatCard
          icon="📊"
          label="총 토큰"
          value={formatTokens(totalTokens)}
          sub={`활성일 ${activeDays}일`}
          color="#c2410c"
        />
        <StatCard
          icon="💬"
          label="총 세션"
          value={totalSessions.toLocaleString()}
          sub={`일평균 ${(totalSessions / Math.max(activeDays, 1)).toFixed(1)}회`}
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

      {/* 입출력 비율 */}
      <div className="rounded-xl border border-[#ecdccc] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⚡</span>
          <span className="text-xs font-medium uppercase tracking-wide text-[#5c4030]">입출력 비율</span>
        </div>
        <div className="flex gap-3 items-end mb-2">
          <div>
            <div className="text-xs text-[#6b5344] mb-0.5">입력 토큰</div>
            <div className="font-mono font-bold text-xl text-sky-700">{formatTokens(totalInput)}</div>
          </div>
          <div className="text-[#8c6248] mb-1 text-lg font-light">/</div>
          <div>
            <div className="text-xs text-[#6b5344] mb-0.5">출력 토큰</div>
            <div className="font-mono font-bold text-xl text-[#c2410c]">{formatTokens(totalOutput)}</div>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-[#f0e4d8]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${(totalInput / Math.max(totalTokens, 1)) * 100}%`,
              background: 'linear-gradient(to right, #0284c7, #ea580c)',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-[#6b5344] mt-1">
          <span>입력 {((totalInput / Math.max(totalTokens, 1)) * 100).toFixed(0)}%</span>
          <span>출력 {((totalOutput / Math.max(totalTokens, 1)) * 100).toFixed(0)}%</span>
        </div>
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

          {/* 최고 사용일 */}
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
