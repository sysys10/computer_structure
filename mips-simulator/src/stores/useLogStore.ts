import { create } from 'zustand'

export interface LogEntry {
  id: number
  timestamp: Date
  message: string
  type?: 'info' | 'error' | 'warn'
}

interface LogState {
  logs: LogEntry[]
  addLog: (message: string, type?: 'info' | 'error' | 'warn') => void
  clearLogs: () => void
}

let nextLogId = 1

const useLogStore = create<LogState>((set) => ({
  logs: [],

  addLog: (message, type = 'info') => {
    set((state) => ({
      logs: [
        ...state.logs,
        {
          id: nextLogId++,
          timestamp: new Date(),
          message,
          type,
        },
      ],
    }))
  },

  clearLogs: () => set({ logs: [] }),
}))

export default useLogStore
