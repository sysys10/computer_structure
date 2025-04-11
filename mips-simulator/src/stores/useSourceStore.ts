import { create } from 'zustand'

interface useSourceStore {
  source: string
  setSource: (source: string) => void
  loaded: boolean
  setLoaded: (loaded: boolean) => void
}

const useSourceStore = create<useSourceStore>((set) => ({
  source: '',
  setSource: (source) => set({ source }),
  loaded: false,
  setLoaded: (loaded) => set({ loaded }),
}))

export { useSourceStore }
