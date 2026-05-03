import { formatLocalYmd } from '../../src/renderer/src/lib/formatters'

export function todayLocalYmd(): string {
  return formatLocalYmd(new Date())
}

export function addCalendarDays(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return formatLocalYmd(new Date(y, m - 1, d + deltaDays))
}
