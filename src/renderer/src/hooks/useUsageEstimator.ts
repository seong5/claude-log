import { useEffect, useMemo, useState } from "react";

const DEFAULT_LIMIT = 1_000_000;
const LIMIT_KEY = "claude-log:usage-estimator-limit";
const MANUAL_LIMIT_KEY = "claude-log:usage-estimator-manual-limit";
const HISTORY_KEY = "claude-log:usage-estimator-history";

type LimitSource = "default" | "learned" | "manual";

function readNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

function readHistory(): number[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as number[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => Number.isFinite(v) && v > 0).slice(-30);
  } catch {
    return [];
  }
}

function percentile90(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9));
  return sorted[idx];
}

export function useUsageEstimator(usedTokens: number, blockStartedAt: number, blockEndsAt: number) {
  const [lastLearnedBlockStart, setLastLearnedBlockStart] = useState(blockStartedAt);
  const [learnedLimit, setLearnedLimit] = useState(() => readNumber(LIMIT_KEY, DEFAULT_LIMIT));
  const [manualLimit, setManualLimitState] = useState<number | null>(() => {
    const n = readNumber(MANUAL_LIMIT_KEY, 0);
    return n > 0 ? n : null;
  });
  const [history, setHistory] = useState<number[]>(() => readHistory());

  useEffect(() => {
    if (blockStartedAt <= lastLearnedBlockStart) return;

    setHistory((prev) => {
      const nextHistory = [...prev, usedTokens].filter((v) => v > 0).slice(-30);
      const p90 = percentile90(nextHistory);
      const nextLimit = Math.max(DEFAULT_LIMIT, Math.round(p90 * 1.05));

      setLearnedLimit(nextLimit);
      setLastLearnedBlockStart(blockStartedAt);

      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
        localStorage.setItem(LIMIT_KEY, String(nextLimit));
      } catch {
        /* ignore */
      }

      return nextHistory;
    });
  }, [blockStartedAt, lastLearnedBlockStart, usedTokens]);

  const estimatedLimit = manualLimit ?? learnedLimit;
  const usagePct = useMemo(() => {
    if (estimatedLimit <= 0) return 0;
    return Math.min((usedTokens / estimatedLimit) * 100, 100);
  }, [estimatedLimit, usedTokens]);

  const limitSource: LimitSource = manualLimit
    ? "manual"
    : learnedLimit > DEFAULT_LIMIT
      ? "learned"
      : "default";

  const setManualLimit = (value: number | null): void => {
    setManualLimitState(value);
    try {
      if (value === null) {
        localStorage.removeItem(MANUAL_LIMIT_KEY);
      } else {
        localStorage.setItem(MANUAL_LIMIT_KEY, String(Math.round(value)));
      }
    } catch {
      /* ignore */
    }
  };

  return {
    estimatedLimit,
    usagePct,
    limitSource,
    manualLimit,
    setManualLimit,
    blockStartedAt,
    blockEndsAt,
  };
}
