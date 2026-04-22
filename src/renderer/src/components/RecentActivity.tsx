import type { DayData } from '../../../preload/index.d'
import { formatTokensShort } from '../lib/formatters'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import { Progress } from './ui/progress'

interface Props {
  days: DayData[]
  today: string
  maxTokens: number
}

export default function RecentActivity({ days, today, maxTokens }: Props) {
  return (
    <Card>
      <CardContent>
        <h2 className="mb-3 text-sm font-extrabold" style={{ color: '#3a2010' }}>
          📅 최근 7일 활동
        </h2>
        <div className="space-y-2.5">
          {days.map((day) => {
            const date = new Date(day.date + 'T00:00:00')
            const isToday = day.date === today
            const pct = maxTokens > 0 ? (day.tokens / maxTokens) * 100 : 0
            const progressValue = day.tokens > 0 ? Math.max(pct, 5) : 0
            return (
              <div key={day.date} className="flex items-center gap-3">
                <div
                  className="flex w-24 shrink-0 items-center gap-1.5 text-xs font-bold"
                  style={{ color: '#9a7060' }}
                >
                  {isToday ? (
                    <Badge variant="warm">오늘</Badge>
                  ) : (
                    date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
                  )}
                </div>
                <div className="flex-1">
                  <Progress
                    className="h-6 bg-[#f5ebe0] border-transparent"
                    value={progressValue}
                    indicatorStyle={{
                      background: 'linear-gradient(to right, #f4a055, #d9622a)',
                    }}
                    indicatorClassName="flex items-center px-3"
                  />
                </div>
                <div
                  className="w-16 shrink-0 text-right font-mono text-xs font-bold"
                  style={{ color: day.tokens > 0 ? '#9a7060' : '#d4b8a4' }}
                >
                  {day.tokens > 0 ? formatTokensShort(day.tokens) : '—'}
                </div>
                <div className="w-10 shrink-0 text-right text-xs font-semibold" style={{ color: '#c0a090' }}>
                  {day.sessions > 0 ? `${day.sessions}회` : ''}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
