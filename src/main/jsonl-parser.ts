import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface ParsedEntry {
  timestamp: string
  sessionId: string
  model: string
  inputTokens: number
  outputTokens: number
}

export interface DayData {
  date: string
  tokens: number
  inputTokens: number
  outputTokens: number
  sessions: number
  modelBreakdown: Record<string, number>
}

export function getClaudeProjectsDir(): string {
  return path.join(os.homedir(), '.claude', 'projects')
}

export function getAllJSONLFiles(): string[] {
  const projectsDir = getClaudeProjectsDir()
  try {
    const projects = fs.readdirSync(projectsDir)
    const files: string[] = []
    for (const project of projects) {
      const projectPath = path.join(projectsDir, project)
      try {
        if (!fs.statSync(projectPath).isDirectory()) continue
        for (const file of fs.readdirSync(projectPath)) {
          if (file.endsWith('.jsonl')) {
            files.push(path.join(projectPath, file))
          }
        }
      } catch {
        /* skip unreadable dirs */
      }
    }
    return files
  } catch {
    return []
  }
}

/**
 * Reads a JSONL file from `fromOffset` bytes, parses assistant entries,
 * and returns new entries + the new safe byte offset.
 * The last incomplete line (actively being written) is never consumed.
 */
export function parseJSONLFrom(
  filePath: string,
  fromOffset: number
): { entries: ParsedEntry[]; newOffset: number } {
  try {
    const stat = fs.statSync(filePath)
    if (stat.size <= fromOffset) return { entries: [], newOffset: fromOffset }

    const fd = fs.openSync(filePath, 'r')
    try {
      const bufSize = stat.size - fromOffset
      const buf = Buffer.alloc(bufSize)
      const bytesRead = fs.readSync(fd, buf, 0, bufSize, fromOffset)
      const text = buf.slice(0, bytesRead).toString('utf8')

      const lines = text.split('\n')
      const entries: ParsedEntry[] = []
      let processedBytes = fromOffset

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // Skip last segment — may be an incomplete line still being written
        if (i === lines.length - 1) break

        const lineBytes = Buffer.byteLength(line, 'utf8') + 1 // +1 for \n

        if (line.trim()) {
          try {
            const obj = JSON.parse(line)
            if (
              obj?.type === 'assistant' &&
              typeof obj.timestamp === 'string' &&
              typeof obj.sessionId === 'string' &&
              obj.message?.usage
            ) {
              const u = obj.message.usage
              entries.push({
                timestamp: obj.timestamp,
                sessionId: obj.sessionId,
                model: obj.message?.model || obj.model || 'unknown',
                inputTokens:
                  (u.input_tokens || 0) +
                  (u.cache_creation_input_tokens || 0) +
                  (u.cache_read_input_tokens || 0),
                outputTokens: u.output_tokens || 0,
              })
            }
          } catch {
            /* skip malformed JSON lines */
          }
        }

        processedBytes += lineBytes
      }

      return { entries, newOffset: processedBytes }
    } finally {
      fs.closeSync(fd)
    }
  } catch {
    return { entries: [], newOffset: fromOffset }
  }
}

export interface SessionData {
  sessionId: string
  tokens: number
  inputTokens: number
  outputTokens: number
  blockTokens: number
  firstTimestamp: string
  blockStartTimestamp: string
  blockEndTimestamp: string
  lastTimestamp: string
}

export type SessionAccum = {
  inputTokens: number
  outputTokens: number
  firstTimestamp: string
  lastTimestamp: string
  entries: Array<{ timestamp: string; tokens: number }>
}

export function mergeEntriesToSessionMap(
  map: Map<string, SessionAccum>,
  entries: ParsedEntry[]
): void {
  for (const entry of entries) {
    const existing = map.get(entry.sessionId)
    if (existing) {
      existing.inputTokens += entry.inputTokens
      existing.outputTokens += entry.outputTokens
      existing.entries.push({ timestamp: entry.timestamp, tokens: entry.inputTokens + entry.outputTokens })
      if (entry.timestamp < existing.firstTimestamp) existing.firstTimestamp = entry.timestamp
      if (entry.timestamp > existing.lastTimestamp) existing.lastTimestamp = entry.timestamp
    } else {
      map.set(entry.sessionId, {
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        firstTimestamp: entry.timestamp,
        lastTimestamp: entry.timestamp,
        entries: [{ timestamp: entry.timestamp, tokens: entry.inputTokens + entry.outputTokens }],
      })
    }
  }
}

export type DayAccum = {
  inputTokens: number
  outputTokens: number
  sessions: Set<string>
  models: Map<string, number>
}

export function mergeEntriesToMap(
  map: Map<string, DayAccum>,
  entries: ParsedEntry[]
): void {
  for (const entry of entries) {
    const date = entry.timestamp.split('T')[0]
    if (!map.has(date)) {
      map.set(date, { inputTokens: 0, outputTokens: 0, sessions: new Set(), models: new Map() })
    }
    const day = map.get(date)!
    const entryTotal = entry.inputTokens + entry.outputTokens
    day.inputTokens += entry.inputTokens
    day.outputTokens += entry.outputTokens
    day.sessions.add(entry.sessionId)
    day.models.set(entry.model, (day.models.get(entry.model) ?? 0) + entryTotal)
  }
}

export function dayMapToArray(map: Map<string, DayAccum>): DayData[] {
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, day]) => ({
      date,
      inputTokens: day.inputTokens,
      outputTokens: day.outputTokens,
      tokens: day.inputTokens + day.outputTokens,
      sessions: day.sessions.size,
      modelBreakdown: Object.fromEntries(day.models),
    }))
}
