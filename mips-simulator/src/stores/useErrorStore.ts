import { create } from 'zustand'

interface ErrorStore {
  error: string
  setError: (error: string) => void
}

const useErrorStore = create<ErrorStore>((set) => ({
  error: '',
  setError: (error) => set({ error }),
}))

export default useErrorStore
