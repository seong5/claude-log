import { app, shell, BrowserWindow, ipcMain, Tray, nativeImage, screen, Menu } from "electron";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "path";
import { execSync } from "node:child_process";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { logService } from "./log-service";

let tray: Tray | null = null;
let popupWindow: BrowserWindow | null = null;
let trayUsageTimer: NodeJS.Timeout | null = null;
let lastOAuthUsageFetchAt = 0;
let lastOAuthUsageResult: OAuthUsageResult | null = null;
const OAUTH_USAGE_MIN_INTERVAL_MS = 5_000;
let oauthUsageInFlight: Promise<OAuthUsageResult> | null = null;
const OAUTH_IPC_MIN_INTERVAL_MS = 1_000;
let lastOAuthIpcAt = 0;

interface AdminWeekUsageResult {
  startingAt: string;
  endingAt: string;
  buckets: number;
  totalTokens: number;
  uncachedInputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  currentSessionTokens: number;
  currentSessionPct: number;
  currentSessionWindowLabel: string;
}

interface UsageResultItem {
  uncached_input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: {
    ephemeral_1h_input_tokens?: number;
    ephemeral_5m_input_tokens?: number;
  };
}

interface UsageBucket {
  results?: UsageResultItem[];
}

interface UsageReportResponse {
  data?: UsageBucket[];
}

interface OAuthUsageResponse {
  five_hour?: { utilization?: number; resets_at?: string };
  seven_day?: { utilization?: number; resets_at?: string };
  seven_day_sonnet?: { utilization?: number; resets_at?: string } | null;
  extra_usage?: { is_enabled?: boolean } | null;
}

interface OAuthUsageResult {
  sessionUsagePercent: number;
  sessionResetSeconds: number;
  weeklyAllModelsPercent: number;
  weeklyAllModelsResetLabel: string;
  weeklySonnetPercent: number;
  planName: string;
}

function formatPercentShort(n: number): string {
  return `${Math.max(0, Math.min(Math.round(n), 100))}%`;
}

function updateTrayTitlePercent(percent: number): void {
  if (!tray) return;
  tray.setTitle(` ${formatPercentShort(percent)}`);
}

async function refreshTrayUsageTitle(): Promise<void> {
  if (!tray) return;
  try {
    const usage = await fetchOAuthUsage();
    updateTrayTitlePercent(usage.sessionUsagePercent);
  } catch {
    // Keep previous title if usage fetch fails.
  }
}

function createTray(): void {
  const iconPath = join(__dirname, "../../build/tray-icon.png");
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 });
  icon.setTemplateImage(false);

  tray = new Tray(icon);
  tray.setToolTip("Claude Log");
  updateTrayTitlePercent(0);

  const trayMenu = Menu.buildFromTemplate([
    { label: "Claude Log 열기", click: togglePopup },
    { type: "separator" },
    { label: "종료", click: () => app.quit() },
  ]);

  tray.on("click", (event) => {
    if (event.ctrlKey) return;
    togglePopup();
  });
  tray.on("right-click", () => {
    if (!tray) return;
    tray.popUpContextMenu(trayMenu);
  });
}

function createPopupWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 480,
    height: 600,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  win.on("blur", () => {
    win.hide();
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return win;
}

function togglePopup(): void {
  if (!popupWindow || !tray) return;

  if (popupWindow.isVisible()) {
    popupWindow.hide();
    return;
  }

  const trayBounds = tray.getBounds();
  const { width: winW, height: winH } = popupWindow.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
  const { bounds: db } = display;

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - winW / 2);
  let y = Math.round(trayBounds.y + trayBounds.height + 4);

  // Keep within screen bounds
  x = Math.min(Math.max(x, db.x), db.x + db.width - winW);
  y = Math.min(y, db.y + db.height - winH);

  popupWindow.setPosition(x, y);
  popupWindow.show();
  popupWindow.focus();
}

function readEnvFromFile(key: string): string | null {
  const candidates = [join(process.cwd(), ".env"), join(app.getAppPath(), ".env")];

  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    try {
      const raw = readFileSync(envPath, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 0) continue;
        const k = trimmed.slice(0, eq).trim();
        if (k !== key) continue;
        const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
        return value || null;
      }
    } catch {
      // ignore env read errors and fallback to process.env
    }
  }
  return null;
}

function getAdminApiKey(): string | null {
  return (
    process.env["ANTHROPIC_ADMIN_API_KEY"] ??
    process.env["ANTROPIC_ADMIN_API_KEY"] ??
    readEnvFromFile("ANTHROPIC_ADMIN_API_KEY") ??
    readEnvFromFile("ANTROPIC_ADMIN_API_KEY")
  );
}

function getOAuthAccessToken(): string | null {
  const envToken =
    process.env["ANTHROPIC_OAUTH_ACCESS_TOKEN"] ??
    readEnvFromFile("ANTHROPIC_OAUTH_ACCESS_TOKEN");
  if (envToken) return envToken;

  const credentialPath = join(homedir(), ".claude", ".credentials.json");
  if (existsSync(credentialPath)) {
    try {
      const raw = readFileSync(credentialPath, "utf8");
      const parsed = JSON.parse(raw) as { claudeAiOauth?: { accessToken?: string } };
      const token = parsed.claudeAiOauth?.accessToken;
      if (token) return token;
    } catch {
      // fall through to keychain
    }
  }

  // macOS Keychain fallback (Claude Code stores credentials here)
  if (process.platform === "darwin") {
    try {
      const raw = execSync('security find-generic-password -s "Claude Code-credentials" -w', {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      const parsed = JSON.parse(raw) as { claudeAiOauth?: { accessToken?: string } };
      return parsed.claudeAiOauth?.accessToken ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

async function fetchOAuthUsage(): Promise<OAuthUsageResult> {
  if (oauthUsageInFlight) return oauthUsageInFlight;

  oauthUsageInFlight = (async () => {
  const now = Date.now();
  if (lastOAuthUsageResult && now - lastOAuthUsageFetchAt < OAUTH_USAGE_MIN_INTERVAL_MS) {
    return lastOAuthUsageResult;
  }

  const accessToken = getOAuthAccessToken();
  if (!accessToken) {
    throw new Error("OAuth 토큰을 찾을 수 없습니다. claude login 후 다시 시도하세요.");
  }

  const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "anthropic-beta": "oauth-2025-04-20",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`OAuth usage API 오류 (${response.status})`);
  }

  const payload = (await response.json()) as OAuthUsageResponse;
  const resetsAt = payload.five_hour?.resets_at ? new Date(payload.five_hour.resets_at).getTime() : Date.now();
  const sessionResetSeconds = Math.max(0, Math.floor((resetsAt - Date.now()) / 1000));
  const weeklyResetLabel = payload.seven_day?.resets_at
    ? new Date(payload.seven_day.resets_at).toLocaleString("ko-KR", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  const result: OAuthUsageResult = {
    sessionUsagePercent: payload.five_hour?.utilization ?? 0,
    sessionResetSeconds,
    weeklyAllModelsPercent: payload.seven_day?.utilization ?? 0,
    weeklyAllModelsResetLabel: weeklyResetLabel,
    weeklySonnetPercent: payload.seven_day_sonnet?.utilization ?? 0,
    planName: payload.extra_usage?.is_enabled ? "Max (Extra)" : "Pro",
  };
  lastOAuthUsageFetchAt = now;
  lastOAuthUsageResult = result;
  return result;
  })();

  try {
    return await oauthUsageInFlight;
  } finally {
    oauthUsageInFlight = null;
  }
}

async function fetchAdminWeekUsage(): Promise<AdminWeekUsageResult> {
  const key = getAdminApiKey();
  if (!key) {
    throw new Error("관리자 API 키를 찾을 수 없습니다. .env에 ANTHROPIC_ADMIN_API_KEY를 설정하세요.");
  }

  const ending = new Date();
  const starting = new Date(ending);
  starting.setUTCDate(starting.getUTCDate() - 7);
  starting.setUTCHours(0, 0, 0, 0);

  const params = new URLSearchParams({
    starting_at: starting.toISOString(),
    ending_at: ending.toISOString(),
    bucket_width: "1d",
    limit: "7",
  });

  const response = await fetch(`https://api.anthropic.com/v1/organizations/usage_report/messages?${params.toString()}`, {
    method: "GET",
    headers: {
      "anthropic-version": "2023-06-01",
      "x-api-key": key,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic Admin API 오류 (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as UsageReportResponse;
  const buckets = payload.data ?? [];
  let uncachedInputTokens = 0;
  let outputTokens = 0;
  let cacheReadInputTokens = 0;
  let cacheCreationInputTokens = 0;

  for (const bucket of buckets) {
    for (const result of bucket.results ?? []) {
      uncachedInputTokens += result.uncached_input_tokens ?? 0;
      outputTokens += result.output_tokens ?? 0;
      cacheReadInputTokens += result.cache_read_input_tokens ?? 0;
      cacheCreationInputTokens +=
        (result.cache_creation?.ephemeral_1h_input_tokens ?? 0) +
        (result.cache_creation?.ephemeral_5m_input_tokens ?? 0);
    }
  }

  const currentSessionLimit = 1_000_000;
  const currentEnding = new Date();
  const currentStarting = new Date(currentEnding.getTime() - 5 * 60 * 60 * 1000);
  const currentParams = new URLSearchParams({
    starting_at: currentStarting.toISOString(),
    ending_at: currentEnding.toISOString(),
    bucket_width: "1h",
    limit: "5",
  });
  const currentResponse = await fetch(
    `https://api.anthropic.com/v1/organizations/usage_report/messages?${currentParams.toString()}`,
    {
      method: "GET",
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": key,
      },
    },
  );
  if (!currentResponse.ok) {
    const body = await currentResponse.text();
    throw new Error(`Anthropic Admin API 오류 (${currentResponse.status}): ${body}`);
  }
  const currentPayload = (await currentResponse.json()) as UsageReportResponse;
  let currentSessionTokens = 0;
  for (const bucket of currentPayload.data ?? []) {
    for (const result of bucket.results ?? []) {
      currentSessionTokens +=
        (result.uncached_input_tokens ?? 0) +
        (result.output_tokens ?? 0) +
        (result.cache_read_input_tokens ?? 0) +
        (result.cache_creation?.ephemeral_1h_input_tokens ?? 0) +
        (result.cache_creation?.ephemeral_5m_input_tokens ?? 0);
    }
  }
  const currentSessionPct = Math.min((currentSessionTokens / currentSessionLimit) * 100, 100);
  const currentSessionWindowLabel = `Recent 5h · ${currentStarting.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${currentEnding.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;

  return {
    startingAt: starting.toISOString(),
    endingAt: ending.toISOString(),
    buckets: buckets.length,
    totalTokens: uncachedInputTokens + outputTokens + cacheReadInputTokens + cacheCreationInputTokens,
    uncachedInputTokens,
    outputTokens,
    cacheReadInputTokens,
    cacheCreationInputTokens,
    currentSessionTokens,
    currentSessionPct,
    currentSessionWindowLabel,
  };
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.seong5.claude-log");

  if (process.platform === "darwin") {
    app.dock?.hide();
  }

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.handle("claude-log:get-days", () => logService.getDays());
  ipcMain.handle("claude-log:get-current-session", () => logService.getCurrentSession());
  ipcMain.handle("claude-log:get-recent-five-hour-tokens", () => logService.getRecentFiveHourTokens());
  ipcMain.handle("claude-log:get-oldest-recent-entry-time", () => logService.getOldestRecentEntryTime());
  ipcMain.handle("claude-log:get-admin-week-usage", async () => fetchAdminWeekUsage());
  ipcMain.handle("claude-log:get-oauth-usage", async () => {
    const now = Date.now();
    if (now - lastOAuthIpcAt < OAUTH_IPC_MIN_INTERVAL_MS) {
      if (lastOAuthUsageResult) return lastOAuthUsageResult;
      if (oauthUsageInFlight) return oauthUsageInFlight;
      throw new Error("요청이 너무 빠릅니다. 잠시 후 다시 시도하세요.");
    }
    lastOAuthIpcAt = now;
    return fetchOAuthUsage();
  });

  logService.init();
  logService.setOnUpdate(() => {
    void refreshTrayUsageTitle();
  });

  createTray();
  void refreshTrayUsageTitle();
  trayUsageTimer = setInterval(() => {
    void refreshTrayUsageTitle();
  }, 5 * 60 * 1000);
  popupWindow = createPopupWindow();
});

app.on("before-quit", () => {
  if (trayUsageTimer) clearInterval(trayUsageTimer);
  logService.destroy();
});
