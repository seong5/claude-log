import { useState } from "react";

const WEEKLY_KEY = "claude-log:weekly-limit";
const SESSION_KEY = "claude-log:session-limit";

function readLS(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeLS(key: string, value: number | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, String(value));
    }
  } catch {
    /* ignore */
  }
}

export function parseLimit(input: string): number | null {
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) return null;

  let multiplier = 1;
  let numStr = trimmed;
  if (trimmed.endsWith("M")) {
    multiplier = 1_000_000;
    numStr = trimmed.slice(0, -1);
  } else if (trimmed.endsWith("K")) {
    multiplier = 1_000;
    numStr = trimmed.slice(0, -1);
  }

  const n = parseFloat(numStr) * multiplier;
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export function formatLimit(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export function useUsageLimits() {
  const [weeklyLimit, setWeeklyLimitState] = useState<number | null>(() => readLS(WEEKLY_KEY));
  const [sessionLimit, setSessionLimitState] = useState<number | null>(() => readLS(SESSION_KEY));

  const setWeeklyLimit = (value: number | null): void => {
    setWeeklyLimitState(value);
    writeLS(WEEKLY_KEY, value);
  };

  const setSessionLimit = (value: number | null): void => {
    setSessionLimitState(value);
    writeLS(SESSION_KEY, value);
  };

  return { weeklyLimit, sessionLimit, setWeeklyLimit, setSessionLimit };
}
