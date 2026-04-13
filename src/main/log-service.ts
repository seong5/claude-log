import * as fs from 'fs'
import * as path from 'path'
import { BrowserWindow } from 'electron'
import {
  getAllJSONLFiles,
  getClaudeProjectsDir,
  parseJSONLFrom,
  mergeEntriesToMap,
  dayMapToArray,
  DayData,
} from './jsonl-parser'

type DayAccum = { inputTokens: number; outputTokens: number; sessions: Set<string> }

interface WatchedFile {
  offset: number
  watcher: fs.FSWatcher | null
}

class LogService {
  private fileState = new Map<string, WatchedFile>()
  private dayMap = new Map<string, DayAccum>()
  private dirWatcher: fs.FSWatcher | null = null
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

  init(): void {
    const files = getAllJSONLFiles()

    for (const filePath of files) {
      const { entries, newOffset } = parseJSONLFrom(filePath, 0)
      mergeEntriesToMap(this.dayMap, entries)
      this.fileState.set(filePath, { offset: newOffset, watcher: null })
    }

    for (const filePath of files) {
      this.startWatcher(filePath)
    }

    this.watchProjectsDir()
  }

  getDays(): DayData[] {
    return dayMapToArray(this.dayMap)
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
        mergeEntriesToMap(this.dayMap, entries)
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
          mergeEntriesToMap(this.dayMap, entries)
          this.pushUpdate()
        }
      })
    } catch {
      /* projects dir may not exist */
    }
  }

  destroy(): void {
    for (const { watcher } of this.fileState.values()) {
      watcher?.close()
    }
    this.fileState.clear()
    this.dayMap.clear()
    this.dirWatcher?.close()
    this.dirWatcher = null
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }
}

export const logService = new LogService()
