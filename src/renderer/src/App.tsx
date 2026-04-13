import { useEffect, useMemo, useState } from 'react'
import TokenHeatmap, { type DayData } from './components/TokenHeatmap'
import StatsPanel from './components/StatsPanel'
import { useLogStore } from './store/useLogStore'

type Period = '3M' | '6M' | '1Y'

const formatTokensShort = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

export default function App(): React.JSX.Element {
  const { days: allDays, loading, init } = useLogStore()
  const [period, setPeriod] = useState<Period>('1Y')

  useEffect(() => {
    init()
  }, [])

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  const filteredData = useMemo<DayData[]>(() => {
    const count = period === '3M' ? 91 : period === '6M' ? 182 : 365
    return allDays.slice(-count)
  }, [allDays, period])

  const totalThisMonth = useMemo(() => {
    const ym = today.slice(0, 7)
    return allDays.filter((d) => d.date.startsWith(ym)).reduce((s, d) => s + d.tokens, 0)
  }, [allDays, today])

  const last7Days = useMemo(() => allDays.slice(-7).reverse(), [allDays])
  const maxLast7 = useMemo(() => Math.max(...last7Days.map((d) => d.tokens), 1), [last7Days])

  return (
    <div
      className="min-h-screen overflow-auto"
      style={{
        backgroundColor: '#fdf6ec',
        fontFamily: "'Nunito', system-ui, sans-serif",
        color: '#4a2e1a',
        backgroundImage: `radial-gradient(ellipse at 20% 0%, rgba(244, 160, 85, 0.08) 0%, transparent 60%),
                          radial-gradient(ellipse at 80% 10%, rgba(217, 98, 42, 0.06) 0%, transparent 50%)`,
      }}
    >
      {/* Top Navigation */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-3"
        style={{
          backgroundColor: 'rgba(253, 246, 236, 0.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #ecdccc',
          boxShadow: '0 1px 12px rgba(180, 100, 50, 0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center mascot-float overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(217, 98, 42, 0.25)' }}
          >
            <img
              src="../../resources/icon.png"
              alt="Claude Log"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.style.background = 'linear-gradient(135deg, #f4a055, #d9622a)'
                  parent.innerHTML = '<span style="font-size:16px">🐙</span>'
                }
              }}
            />
          </div>
          <span className="font-bold text-sm" style={{ color: '#4a2e1a', letterSpacing: '-0.01em' }}>
            Claude Log
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: '#fde8d5', color: '#d9622a', border: '1px solid #f4c4a0' }}
          >
            Beta
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ backgroundColor: '#f0faf2', border: '1px solid #c0e8cc' }}
          >
            <span
              className="live-dot inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: '#6daa7c' }}
            />
            <span style={{ color: '#4a8c5c', fontWeight: 600 }}>실시간 추적 중</span>
          </div>
          <div
            className="px-3 py-1.5 rounded-xl"
            style={{
              backgroundColor: '#fde8d5',
              border: '1px solid #f4c4a0',
              color: '#8c6248',
            }}
          >
            이번 달{' '}
            <span className="font-mono font-bold ml-1" style={{ color: '#d9622a' }}>
              {formatTokensShort(totalThisMonth)}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Hero section */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-extrabold mb-1"
              style={{ color: '#3a2010', letterSpacing: '-0.02em' }}
            >
              토큰 사용량 ✨
            </h1>
            <p className="text-sm font-medium" style={{ color: '#9a7060' }}>
              Claude Code 세션의 일별 토큰 소비량을 추적합니다
            </p>
          </div>
          {/* Period selector */}
          <div
            className="flex gap-1 p-1 rounded-2xl"
            style={{ backgroundColor: '#f5ebe0', border: '1px solid #ecdccc' }}
          >
            {(['3M', '6M', '1Y'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={
                  period === p
                    ? {
                        backgroundColor: '#fffcf8',
                        color: '#d9622a',
                        boxShadow: '0 1px 6px rgba(180, 100, 50, 0.12)',
                      }
                    : { color: '#b89680' }
                }
              >
                {p === '3M' ? '3개월' : p === '6M' ? '6개월' : '1년'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div
            className="rounded-3xl p-12 flex items-center justify-center"
            style={{
              backgroundColor: '#fffcf8',
              border: '1px solid #ecdccc',
            }}
          >
            <p className="text-sm font-semibold" style={{ color: '#c0a090' }}>
              JSONL 파일 파싱 중…
            </p>
          </div>
        ) : (
          <>
            {/* Heatmap Card */}
            <div
              className="rounded-3xl p-6"
              style={{
                backgroundColor: '#fffcf8',
                border: '1px solid #ecdccc',
                boxShadow: '0 2px 16px rgba(180, 100, 50, 0.07)',
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-extrabold text-base" style={{ color: '#3a2010' }}>
                    🗓 활동 히트맵
                  </h2>
                  <p className="text-xs font-medium mt-0.5" style={{ color: '#9a7060' }}>
                    {period === '1Y' ? '최근 1년' : period === '6M' ? '최근 6개월' : '최근 3개월'} 토큰 사용 기록
                  </p>
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: '#fde8d5', border: '1px solid #f4c4a0' }}
                >
                  <span className="text-sm">🔥</span>
                  <span className="font-bold text-sm" style={{ color: '#d9622a' }}>
                    {filteredData.filter((d) => d.tokens > 0).length}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: '#c07050' }}>일 활성</span>
                </div>
              </div>
              <div className="overflow-x-auto pb-2">
                <TokenHeatmap data={filteredData} />
              </div>
            </div>

            {/* Stats */}
            <div>
              <h2 className="font-extrabold text-base mb-3" style={{ color: '#3a2010' }}>
                📊 요약 통계
              </h2>
              <StatsPanel data={filteredData} />
            </div>

            {/* Recent activity */}
            <div
              className="rounded-3xl p-6"
              style={{
                backgroundColor: '#fffcf8',
                border: '1px solid #ecdccc',
                boxShadow: '0 2px 16px rgba(180, 100, 50, 0.07)',
              }}
            >
              <h2 className="font-extrabold text-base mb-5" style={{ color: '#3a2010' }}>
                📅 최근 7일 활동
              </h2>
              <div className="space-y-2.5">
                {last7Days.map((day) => {
                  const date = new Date(day.date + 'T00:00:00')
                  const isToday = day.date === today
                  const pct = (day.tokens / maxLast7) * 100
                  return (
                    <div key={day.date} className="flex items-center gap-3">
                      <div
                        className="text-xs font-bold w-24 shrink-0 flex items-center gap-1.5"
                        style={{ color: '#9a7060' }}
                      >
                        {isToday ? (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: '#fde8d5', color: '#d9622a', border: '1px solid #f4c4a0' }}
                          >
                            오늘
                          </span>
                        ) : (
                          date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
                        )}
                      </div>
                      <div
                        className="flex-1 h-6 rounded-full overflow-hidden"
                        style={{ backgroundColor: '#f5ebe0' }}
                      >
                        {day.tokens > 0 && (
                          <div
                            className="h-full rounded-full flex items-center px-3 transition-all duration-500"
                            style={{
                              width: `${Math.max(pct, 5)}%`,
                              background: 'linear-gradient(to right, #f4a055, #d9622a)',
                            }}
                          >
                            <span
                              className="text-[10px] font-bold font-mono whitespace-nowrap overflow-hidden"
                              style={{ color: '#fff8f4' }}
                            >
                              {pct > 30 ? formatTokensShort(day.tokens) : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        className="text-xs font-mono font-bold w-16 text-right shrink-0"
                        style={{ color: day.tokens > 0 ? '#9a7060' : '#d4b8a4' }}
                      >
                        {day.tokens > 0 ? formatTokensShort(day.tokens) : '—'}
                      </div>
                      <div
                        className="text-xs font-semibold w-10 text-right shrink-0"
                        style={{ color: '#c0a090' }}
                      >
                        {day.sessions > 0 ? `${day.sessions}회` : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        className="max-w-6xl mx-auto px-6 py-6 mt-4"
        style={{ borderTop: '1px solid #ecdccc' }}
      >
        <p className="text-xs font-semibold text-center" style={{ color: '#c0a090' }}>
          Claude Log · 데이터는 로컬에 저장됩니다 · ~/.claude/projects/**/*.jsonl
        </p>
      </footer>
    </div>
  )
}
