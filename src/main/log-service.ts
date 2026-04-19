import * as fs from 'fs'
import * as path from 'path'
import { BrowserWindow } from 'electron'
import {
  getAllJSONLFiles,
  getClaudeProjectsDir,
  parseJSONLFrom,
  mergeEntriesToMap,
  mergeEntriesToSessionMap,
  dayMapToArray,
  DayData,
  DayAccum,
  SessionData,
  SessionAccum,
  ParsedEntry,
} from './jsonl-parser'

interface WatchedFile {
  offset: number
  watcher: fs.FSWatcher | null
}

class LogService {
  private static readonly FIVE_HOUR_MS = 5 * 60 * 60 * 1000
  private fileState = new Map<string, WatchedFile>()
  private dayMap = new Map<string, DayAccum>()
  private sessionMap = new Map<string, SessionAccum>()
  private recentEntries: Array<{ ts: number; tokens: number }> = []
  private dirWatcher: fs.FSWatcher | null = null
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private onUpdateCallback: ((todayTokens: number) => void) | null = null

  init(): void {
    const files = getAllJSONLFiles()

    for (const filePath of files) {
      const { entries, newOffset } = parseJSONLFrom(filePath, 0)
      this.applyEntries(entries)
      this.fileState.set(filePath, { offset: newOffset, watcher: null })
    }

    for (const filePath of files) {
      this.startWatcher(filePath)
    }

    this.watchProjectsDir()
  }

  setOnUpdate(cb: (todayTokens: number) => void): void {
    this.onUpdateCallback = cb
  }

  getDays(): DayData[] {
    return dayMapToArray(this.dayMap)
  }

  getCurrentSession(): SessionData | null {
    const todayUTC = new Date().toISOString().split('T')[0]
    let latest: (SessionAccum & { sessionId: string }) | null = null

    for (const [sessionId, accum] of this.sessionMap) {
      if (!accum.lastTimestamp.startsWith(todayUTC)) continue
      if (!latest || accum.lastTimestamp > latest.lastTimestamp) {
        latest = { sessionId, ...accum }
      }
    }

    if (!latest) return null
    const firstMs = Date.parse(latest.firstTimestamp)
    const now = Date.now()
    const safeFirstMs = Number.isFinite(firstMs) ? firstMs : now
    const blockIndex = Math.max(0, Math.floor((now - safeFirstMs) / LogService.FIVE_HOUR_MS))
    const blockStartMs = safeFirstMs + blockIndex * LogService.FIVE_HOUR_MS
    const blockEndMs = blockStartMs + LogService.FIVE_HOUR_MS
    const blockTokens = latest.entries.reduce((sum, entry) => {
      const ts = Date.parse(entry.timestamp)
      if (!Number.isFinite(ts)) return sum
      return ts >= blockStartMs && ts < blockEndMs ? sum + entry.tokens : sum
    }, 0)

    return {
      sessionId: latest.sessionId,
      tokens: latest.inputTokens + latest.outputTokens,
      inputTokens: latest.inputTokens,
      outputTokens: latest.outputTokens,
      blockTokens,
      firstTimestamp: new Date(safeFirstMs).toISOString(),
      blockStartTimestamp: new Date(blockStartMs).toISOString(),
      blockEndTimestamp: new Date(blockEndMs).toISOString(),
      lastTimestamp: latest.lastTimestamp,
    }
  }

  getTodayTokens(): number {
    const today = new Date()
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const day = this.dayMap.get(ymd)
    return day ? day.inputTokens + day.outputTokens : 0
  }

  getRecentFiveHourTokens(): number {
    this.pruneRecentEntries(Date.now())
    return this.recentEntries.reduce((sum, entry) => sum + entry.tokens, 0)
  }

  getOldestRecentEntryTime(): number | null {
    this.pruneRecentEntries(Date.now())
    if (this.recentEntries.length === 0) return null
    return Math.min(...this.recentEntries.map((e) => e.ts))
  }

  private startWatcher(filePath: string): void {
    const state = this.fileState.get(filePath)
    if (!state || state.watcher) return

    try {
      const watcher = fs.watch(filePath, (event) => {
        if (event === 'change') this.scheduleRead(filePath)
      })
      state.watcher = watcher
    } catch {
      /* file temporarily unreadable */
    }
  }

  private scheduleRead(filePath: string): void {
    const existing = this.debounceTimers.get(filePath)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath)
      const state = this.fileState.get(filePath)
      if (!state) return

      const { entries, newOffset } = parseJSONLFrom(filePath, state.offset)
      state.offset = newOffset

      if (entries.length > 0) {
        this.applyEntries(entries)
        this.pushUpdate()
      }
    }, 150)

    this.debounceTimers.set(filePath, timer)
  }

  private pushUpdate(): void {
    const days = this.getDays()
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('claude-log:update', days)
      }
    }
    this.onUpdateCallback?.(this.getTodayTokens())
  }

  private watchProjectsDir(): void {
    const projectsDir = getClaudeProjectsDir()
    try {
      this.dirWatcher = fs.watch(projectsDir, { recursive: true }, (_event, filename) => {
        if (!filename || !filename.endsWith('.jsonl')) return
        const filePath = path.join(projectsDir, filename)
        if (this.fileState.has(filePath)) return

        const { entries, newOffset } = parseJSONLFrom(filePath, 0)
        this.fileState.set(filePath, { offset: newOffset, watcher: null })
        this.startWatcher(filePath)

        if (entries.length > 0) {
          this.applyEntries(entries)
          this.pushUpdate()
        }
      })
    } catch {
      /* projects dir may not exist */
    }
  }

  private applyEntries(entries: ParsedEntry[]): void {
    mergeEntriesToMap(this.dayMap, entries)
    mergeEntriesToSessionMap(this.sessionMap, entries)

    const now = Date.now()
    const cutoff = now - LogService.FIVE_HOUR_MS
    for (const entry of entries) {
      const ts = Date.parse(entry.timestamp)
      if (!Number.isFinite(ts) || ts < cutoff) continue
      this.recentEntries.push({ ts, tokens: entry.inputTokens + entry.outputTokens })
    }
    this.pruneRecentEntries(now)
  }

  private pruneRecentEntries(now: number): void {
    const cutoff = now - LogService.FIVE_HOUR_MS
    if (this.recentEntries.length === 0) return
    this.recentEntries = this.recentEntries.filter((entry) => entry.ts >= cutoff)
  }

  destroy(): void {
    for (const { watcher } of this.fileState.values()) {
      watcher?.close()
    }
    this.fileState.clear()
    this.dayMap.clear()
    this.sessionMap.clear()
    this.recentEntries = []
    this.dirWatcher?.close()
    this.dirWatcher = null
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }
}

export const logService = new LogService()
