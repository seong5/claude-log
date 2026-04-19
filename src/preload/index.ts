import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { DayData } from './index.d'

const claudeLogAPI = {
  getDays: () => ipcRenderer.invoke('claude-log:get-days'),
  getCurrentSession: () => ipcRenderer.invoke('claude-log:get-current-session'),
  getRecentFiveHourTokens: () => ipcRenderer.invoke('claude-log:get-recent-five-hour-tokens'),
  getOldestRecentEntryTime: () => ipcRenderer.invoke('claude-log:get-oldest-recent-entry-time'),
  onUpdate: (callback: (days: DayData[]) => void) => {
    const handler = (_: Electron.IpcRendererEvent, days: DayData[]) => callback(days)
    ipcRenderer.on('claude-log:update', handler)
    return () => ipcRenderer.removeListener('claude-log:update', handler)
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('claudeLog', claudeLogAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.claudeLog = claudeLogAPI
}
