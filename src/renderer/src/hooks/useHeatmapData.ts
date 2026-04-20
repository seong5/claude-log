import { useMemo } from 'react'
import type { DayData } from '../../../preload/index.d'
import { formatLocalYmd } from '../lib/formatters'

const HEATMAP_START = new Date('2026-01-01T00:00:00')
const HEATMAP_END = new Date(2026, 6, 0)

const EMPTY_DAY = (date: string): DayData => ({
  date,
  tokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  sessions: 0,
  modelBreakdown: {},
})

export function useHeatmapData(allDays: DayData[], today: string) {
  const heatmapData = useMemo<DayData[]>(() => {
    if (allDays.length === 0) return []
    const dataMap = new Map(allDays.map((d) => [d.date, d]))
    const result: DayData[] = []
    const cur = new Date(HEATMAP_START)
    while (cur <= HEATMAP_END) {
      const ds = formatLocalYmd(cur)
      result.push(dataMap.get(ds) ?? EMPTY_DAY(ds))
      cur.setDate(cur.getDate() + 1)
    }
    return result
  }, [allDays])

  const filteredData = useMemo<DayData[]>(
    () => heatmapData.filter((d) => d.date <= today),
    [heatmapData, today],
  )

  const totalThisMonth = useMemo(() => {
    const ym = today.slice(0, 7)
    return allDays.filter((d) => d.date.startsWith(ym)).reduce((s, d) => s + d.tokens, 0)
  }, [allDays, today])

  const last7Days = useMemo(() => {
    const dataMap = new Map(allDays.map((d) => [d.date, d]))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today + 'T00:00:00')
      d.setDate(d.getDate() - i)
      const ds = formatLocalYmd(d)
      return dataMap.get(ds) ?? EMPTY_DAY(ds)
    })
  }, [allDays, today])

  const maxLast7 = useMemo(() => Math.max(...last7Days.map((d) => d.tokens), 1), [last7Days])

  const thisWeekTokens = useMemo(() => {
    const map = new Map(allDays.map((d) => [d.date, d]))
    let sum = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(today + 'T00:00:00')
      d.setDate(d.getDate() - i)
      sum += map.get(formatLocalYmd(d))?.tokens ?? 0
    }
    return sum
  }, [allDays, today])

  return { heatmapData, filteredData, totalThisMonth, last7Days, maxLast7, thisWeekTokens }
}
