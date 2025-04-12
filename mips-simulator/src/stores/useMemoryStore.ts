import { create } from 'zustand'
import useCpuStore from './useCpuStore'

interface MemoryState {
  viewAddress: number
  setViewAddress: (address: number) => void
  getMemoryView: (numRows: number, bytesPerRow: number) => Uint8Array
  parseAddress: (addressStr: string) => number | null
}

const useMemoryStore = create<MemoryState>((set, get) => ({
  viewAddress: 0x10000000, // Default data segment address

  setViewAddress: (address) => {
    set({ viewAddress: address })
  },

  getMemoryView: (numRows, bytesPerRow) => {
    const { viewAddress } = get()
    const totalBytes = numRows * bytesPerRow

    // Use CPU store to get memory content
    return useCpuStore.getState().getMemoryAt(viewAddress, totalBytes)
  },

  parseAddress: (addressStr) => {
    // Try to parse hex address
    if (addressStr.startsWith('0x')) {
      try {
        return parseInt(addressStr, 16)
      } catch (e) {
        return null
      }
    }

    // Try to parse decimal address
    try {
      return parseInt(addressStr, 10)
    } catch (e) {
      return null
    }
  },
}))

export default useMemoryStore
