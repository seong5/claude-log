import { app, shell, BrowserWindow, ipcMain, Tray, nativeImage, screen, Menu } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { logService } from "./log-service";

let tray: Tray | null = null;
let popupWindow: BrowserWindow | null = null;

function formatTokensShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function updateTrayTitle(tokens: number): void {
  if (!tray) return;
  tray.setTitle(tokens > 0 ? ` ${formatTokensShort(tokens)}` : "");
}

function createTray(): void {
  const iconPath = join(__dirname, "../../build/tray-icon.png");
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 });
  icon.setTemplateImage(false);

  tray = new Tray(icon);
  tray.setToolTip("Claude Log");
  updateTrayTitle(logService.getTodayTokens());

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

  logService.init();
  logService.setOnUpdate((todayTokens) => updateTrayTitle(todayTokens));

  createTray();
  popupWindow = createPopupWindow();
});

app.on("before-quit", () => {
  logService.destroy();
});
