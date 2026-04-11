import { useMemo, useState } from 'react'
import TokenHeatmap, { type DayData } from './components/TokenHeatmap'
import StatsPanel from './components/StatsPanel'

// Generate 365 days of mock data ending today
function generateMockData(): DayData[] {
  const data: DayData[] = []
  const today = new Date('2026-04-11')

  // Seed-based pseudo-random for consistent renders
  let seed = 42
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return (seed >>> 0) / 0xffffffff
  }

  for (let i = 364; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dow = date.getDay()
    const isWeekday = dow !== 0 && dow !== 6

    // Simulate realistic usage: active weekdays, occasional weekends, some dead days
    let tokens = 0
    const active = rand() < (isWeekday ? 0.82 : 0.35)
    if (active) {
      const base = isWeekday ? rand() * 80_000 : rand() * 25_000
      const spike = rand() < 0.08 ? rand() * 150_000 : 0
      tokens = Math.floor(base + spike + 3_000)
    }

    const inputRatio = 0.55 + rand() * 0.1
    const inputTokens = Math.floor(tokens * inputRatio)
    const outputTokens = tokens - inputTokens
    const sessions = tokens > 0 ? Math.ceil(rand() * 8 + 1) : 0

    data.push({
      date: date.toISOString().split('T')[0],
      tokens,
      inputTokens,
      outputTokens,
      sessions,
    })
  }
  return data
}

type Period = '3M' | '6M' | '1Y'

export default function App(): React.JSX.Element {
  const allData = useMemo(() => generateMockData(), [])
  const [period, setPeriod] = useState<Period>('1Y')

  const filteredData = useMemo(() => {
    const days = period === '3M' ? 91 : period === '6M' ? 182 : 365
    return allData.slice(allData.length - days)
  }, [allData, period])

  const totalThisMonth = useMemo(() => {
    const now = new Date('2026-04-11')
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return allData.filter((d) => d.date.startsWith(ym)).reduce((s, d) => s + d.tokens, 0)
  }, [allData])

  const formatTokensShort = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
    return n.toString()
  }

  return (
    <div
      className="min-h-screen text-gray-100 overflow-auto"
      style={{ backgroundColor: '#0c0a09', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Top Navigation */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: '#0c0a09cc', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1c1917' }}
      >
        <div className="flex items-center gap-3">
          {/* Claude icon */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #fb923c, #c2410c)' }}
          >
            C
          </div>
          <span className="font-semibold text-gray-100 text-sm">Claude Code Analytics</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: '#292524', color: '#fb923c' }}
          >
            Beta
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: '#4ade80' }}
            />
            실시간 추적 중
          </div>
          <div
            className="px-3 py-1.5 rounded-lg text-gray-300"
            style={{ backgroundColor: '#1c1917', border: '1px solid #292524' }}
          >
            이번 달 <span className="font-mono text-orange-400 ml-1">{formatTokensShort(totalThisMonth)}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Hero section */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-50 mb-1">토큰 사용량</h1>
            <p className="text-gray-400 text-sm">Claude Code 세션의 일별 토큰 소비량을 추적합니다</p>
          </div>
          {/* Period selector */}
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{ backgroundColor: '#1c1917', border: '1px solid #292524' }}
          >
            {(['3M', '6M', '1Y'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={
                  period === p
                    ? { backgroundColor: '#292524', color: '#fb923c' }
                    : { color: '#6b7280' }
                }
              >
                {p === '3M' ? '3개월' : p === '6M' ? '6개월' : '1년'}
              </button>
            ))}
          </div>
        </div>

        {/* Heatmap Card */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: '#111110', border: '1px solid #1c1917' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-200 text-sm">활동 히트맵</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {period === '1Y' ? '최근 1년' : period === '6M' ? '최근 6개월' : '최근 3개월'} 토큰 사용 기록
              </p>
            </div>
            <div className="text-xs text-gray-500">
              <span className="text-orange-400 font-semibold text-sm">
                {filteredData.filter((d) => d.tokens > 0).length}
              </span>
              일 활성
            </div>
          </div>
          <div className="overflow-x-auto pb-2">
            <TokenHeatmap data={filteredData} />
          </div>
        </div>

        {/* Stats */}
        <div>
          <h2 className="font-semibold text-gray-200 text-sm mb-3">요약 통계</h2>
          <StatsPanel data={filteredData} />
        </div>

        {/* Recent activity */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: '#111110', border: '1px solid #1c1917' }}
        >
          <h2 className="font-semibold text-gray-200 text-sm mb-4">최근 7일 활동</h2>
          <div className="space-y-2">
            {allData
              .slice(-7)
              .reverse()
              .map((day) => {
                const date = new Date(day.date + 'T00:00:00')
                const isToday = day.date === '2026-04-11'
                const maxT = Math.max(...allData.slice(-7).map((d) => d.tokens), 1)
                const pct = (day.tokens / maxT) * 100
                return (
                  <div key={day.date} className="flex items-center gap-4">
                    <div className="text-xs text-gray-400 w-24 shrink-0 flex items-center gap-1.5">
                      {isToday && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ backgroundColor: '#431407', color: '#fb923c' }}
                        >
                          오늘
                        </span>
                      )}
                      {!isToday &&
                        date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                    </div>
                    <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ backgroundColor: '#1c1917' }}>
                      {day.tokens > 0 && (
                        <div
                          className="h-full rounded-md flex items-center px-2 transition-all"
                          style={{
                            width: `${Math.max(pct, 4)}%`,
                            background: 'linear-gradient(to right, #7c2d12, #fb923c)',
                          }}
                        >
                          <span className="text-[10px] font-mono text-orange-100 whitespace-nowrap overflow-hidden">
                            {pct > 25 ? formatTokensShort(day.tokens) : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-mono text-gray-400 w-16 text-right shrink-0">
                      {day.tokens > 0 ? formatTokensShort(day.tokens) : <span className="text-gray-700">—</span>}
                    </div>
                    <div className="text-xs text-gray-600 w-10 text-right shrink-0">
                      {day.sessions > 0 ? `${day.sessions}회` : ''}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-6 mt-4" style={{ borderTop: '1px solid #1c1917' }}>
        <p className="text-xs text-gray-600 text-center">
          Claude Code Analytics · 데이터는 로컬에 저장됩니다 · Mock data for UI preview
        </p>
      </footer>
    </div>
  )
}
