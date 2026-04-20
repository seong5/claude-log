import type { DayData } from '../../../preload/index.d'
import { formatTokensShort } from '../lib/formatters'

interface Props {
  days: DayData[]
  today: string
  maxTokens: number
}

export default function RecentActivity({ days, today, maxTokens }: Props) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: '#fffcf8',
        border: '1px solid #ecdccc',
        boxShadow: '0 2px 16px rgba(180, 100, 50, 0.07)',
      }}
    >
      <h2 className="font-extrabold text-sm mb-3" style={{ color: '#3a2010' }}>
        📅 최근 7일 활동
      </h2>
      <div className="space-y-2.5">
        {days.map((day) => {
          const date = new Date(day.date + 'T00:00:00')
          const isToday = day.date === today
          const pct = (day.tokens / maxTokens) * 100
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
              <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ backgroundColor: '#f5ebe0' }}>
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
              <div className="text-xs font-semibold w-10 text-right shrink-0" style={{ color: '#c0a090' }}>
                {day.sessions > 0 ? `${day.sessions}회` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
