import { useCallback, useState } from "react";
import type { OAuthUsageData } from "../../../preload/index.d";

export function useOAuthUsage() {
  const [data, setData] = useState<OAuthUsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setData(await window.claudeLog.getOAuthUsage());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "OAuth usage 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetch };
}
