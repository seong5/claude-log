import type { DayData } from './TokenHeatmap'

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatCost(tokens: number): string {
  // Rough estimate: Claude Sonnet ~$3/1M input, $15/1M output (mixed)
  const cost = (tokens / 1_000_000) * 9
  if (cost >= 1) return `$${cost.toFixed(2)}`
  return `$${cost.toFixed(3)}`
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  color?: string
  icon: string
}

function StatCard({ label, value, sub, color = '#fb923c', icon }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ backgroundColor: '#1c1917', border: '1px solid #292524' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="font-mono font-bold text-2xl" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  )
}

interface ModelBreakdownProps {
  data: { model: string; tokens: number; color: string }[]
  total: number
}

function ModelBreakdown({ data, total }: ModelBreakdownProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: '#1c1917', border: '1px solid #292524' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">모델별 사용량</span>
      </div>
      <div className="space-y-2">
        {data.map((m) => {
          const pct = total > 0 ? (m.tokens / total) * 100 : 0
          return (
            <div key={m.model}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300">{m.model}</span>
                <span className="font-mono text-gray-400">{formatTokens(m.tokens)}</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ backgroundColor: '#292524' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: m.color }}
                />
              </div>
            </div>
          )
        })}
      </div>
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
  const avgPerDay = activeDays > 0 ? Math.floor(totalTokens / activeDays) : 0
  const totalSessions = data.reduce((s, d) => s + d.sessions, 0)

  const peak = data.reduce((best, d) => (d.tokens > best.tokens ? d : best), data[0])
  const peakDate = peak
    ? new Date(peak.date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : '-'

  // Streak
  let streak = 0
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].tokens > 0) streak++
    else break
  }

  // Mock model breakdown
  const modelData = [
    { model: 'claude-sonnet-4-6', tokens: Math.floor(totalTokens * 0.55), color: '#fb923c' },
    { model: 'claude-opus-4-6', tokens: Math.floor(totalTokens * 0.3), color: '#c084fc' },
    { model: 'claude-haiku-4-5', tokens: Math.floor(totalTokens * 0.15), color: '#34d399' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon="🔥"
        label="연속 사용일"
        value={`${streak}일`}
        sub="현재 스트릭"
        color="#fb923c"
      />
      <StatCard
        icon="📊"
        label="총 토큰"
        value={formatTokens(totalTokens)}
        sub={`활성일 ${activeDays}일`}
        color="#fb923c"
      />
      <StatCard
        icon="💬"
        label="총 세션"
        value={totalSessions.toLocaleString()}
        sub={`일평균 ${(totalSessions / Math.max(activeDays, 1)).toFixed(1)}회`}
        color="#a78bfa"
      />
      <StatCard
        icon="💰"
        label="예상 비용"
        value={formatCost(totalTokens)}
        sub="올해 누적 (추정)"
        color="#34d399"
      />

      <div
        className="rounded-xl p-4 col-span-2"
        style={{ backgroundColor: '#1c1917', border: '1px solid #292524' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⚡</span>
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">입출력 비율</span>
        </div>
        <div className="flex gap-3 items-end mb-2">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">입력 토큰</div>
            <div className="font-mono font-bold text-xl text-sky-400">{formatTokens(totalInput)}</div>
          </div>
          <div className="text-gray-600 mb-1 text-lg font-light">/</div>
          <div>
            <div className="text-xs text-gray-500 mb-0.5">출력 토큰</div>
            <div className="font-mono font-bold text-xl text-orange-400">{formatTokens(totalOutput)}</div>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#292524' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${(totalInput / Math.max(totalTokens, 1)) * 100}%`,
              background: 'linear-gradient(to right, #38bdf8, #fb923c)',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>입력 {((totalInput / Math.max(totalTokens, 1)) * 100).toFixed(0)}%</span>
          <span>출력 {((totalOutput / Math.max(totalTokens, 1)) * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: '#1c1917', border: '1px solid #292524' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📈</span>
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">일 평균</span>
        </div>
        <div className="font-mono font-bold text-2xl text-orange-300">{formatTokens(avgPerDay)}</div>
        <div className="text-xs text-gray-500 mt-1">활성일 기준</div>
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid #292524' }}>
          <div className="text-xs text-gray-500">최고 사용일</div>
          <div className="text-sm text-gray-300 font-mono">{peakDate}</div>
          <div className="text-xs text-orange-400 font-mono">{formatTokens(peak?.tokens ?? 0)}</div>
        </div>
      </div>

      <ModelBreakdown data={modelData} total={totalTokens} />
    </div>
  )
}
