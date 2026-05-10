import { useMemo } from 'react';
import type { DayData } from '../../../preload/index.d';
import { formatLocalYmd } from '../lib/formatters';

export function getHeatmapRange(): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1); // 올해 1월 1일
  const end = new Date(year, 11, 31); // 올해 12월 31일
  return { start, end };
}

const EMPTY_DAY = (date: string): DayData => ({
  date,
  tokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  sessions: 0,
  modelBreakdown: {},
});

export function useHeatmapData(allDays: DayData[], today: string) {
  const heatmapData = useMemo<DayData[]>(() => {
    if (allDays.length === 0) return [];
    const { start, end } = getHeatmapRange();
    const dataMap = new Map(allDays.map((d) => [d.date, d]));
    const result: DayData[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const ds = formatLocalYmd(cur);
      result.push(dataMap.get(ds) ?? EMPTY_DAY(ds));
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [allDays]);

  const filteredData = useMemo<DayData[]>(
    () => heatmapData.filter((d) => d.date <= today),
    [heatmapData, today],
  );

  const totalThisMonth = useMemo(() => {
    const ym = today.slice(0, 7);
    return allDays.filter((d) => d.date.startsWith(ym)).reduce((s, d) => s + d.tokens, 0);
  }, [allDays, today]);

  const last7Days = useMemo(() => {
    const dataMap = new Map(allDays.map((d) => [d.date, d]));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today + 'T00:00:00');
      d.setDate(d.getDate() - i);
      const ds = formatLocalYmd(d);
      return dataMap.get(ds) ?? EMPTY_DAY(ds);
    });
  }, [allDays, today]);

  const maxLast7 = useMemo(() => Math.max(...last7Days.map((d) => d.tokens), 1), [last7Days]);

  const weekData = useMemo(() => {
    const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}(${KO_DAYS[d.getDay()]})`;
    const dataMap = new Map(allDays.map((d) => [d.date, d]));

    const todayDate = new Date(today + 'T00:00:00');
    const daysFromMonday = todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1;

    const thisMonday = new Date(todayDate);
    thisMonday.setDate(todayDate.getDate() - daysFromMonday);

    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);

    let thisWeekTokens = 0;
    const cur1 = new Date(thisMonday);
    while (cur1 <= todayDate) {
      thisWeekTokens += dataMap.get(formatLocalYmd(cur1))?.tokens ?? 0;
      cur1.setDate(cur1.getDate() + 1);
    }

    let lastWeekTokens = 0;
    const cur2 = new Date(lastMonday);
    while (cur2 <= lastSunday) {
      lastWeekTokens += dataMap.get(formatLocalYmd(cur2))?.tokens ?? 0;
      cur2.setDate(cur2.getDate() + 1);
    }

    return {
      thisWeekTokens,
      lastWeekTokens,
      lastWeekLabel: `기준 : ${fmt(lastMonday)} ~ ${fmt(lastSunday)}`,
    };
  }, [allDays, today]);

  return { heatmapData, filteredData, totalThisMonth, last7Days, maxLast7, ...weekData };
}
