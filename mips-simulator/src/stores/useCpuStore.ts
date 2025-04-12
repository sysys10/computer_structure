import { create } from 'zustand'
import { Memory } from '@/models/memory'
import { CPU, ExceptionCode } from '@/models/cpu'

interface CpuState {
  memory: Memory
  cpu: CPU
  running: boolean
  registers: Uint32Array
  pc: number
  instruction: number
  cycle: number
  setRunning: (running: boolean) => void
  step: () => ExceptionCode
  run: () => void
  stop: () => void
  reset: () => void
  getMemoryAt: (address: number, length: number) => Uint8Array
}

let runInterval: number | undefined

// Initialize memory and CPU once
const memory = new Memory()
const cpu = new CPU(memory)

const useCpuStore = create<CpuState>((set, get) => ({
  memory,
  cpu,
  running: false,
  registers: cpu.registerFile,
  pc: cpu.pc,
  instruction: 0,
  cycle: 0,

  setRunning: (running) => set({ running }),

  step: () => {
    const { cpu } = get()

    // Execute one instruction
    const exception = cpu.step()

    // Update state with new values
    set({
      pc: cpu.pc,
      instruction: get().memory.getWord(cpu.pc),
      cycle: cpu.cycle,
      registers: cpu.registerFile,
    })

    return exception
  },

  run: () => {
    const { step } = get()

    // Stop any existing run
    if (runInterval) {
      clearInterval(runInterval)
    }

    // Set running state
    set({ running: true })

    // Start running at 10Hz (adjust as needed)
    runInterval = window.setInterval(() => {
      const exception = step()

      // Stop if we hit an exception or if the CPU is halted
      if (exception !== ExceptionCode.NONE || get().cpu.halted) {
        get().stop()

        // Handle exceptions here (could add to a log)
      }
    }, 100)
  },

  stop: () => {
    if (runInterval) {
      clearInterval(runInterval)
      runInterval = undefined
    }
    set({ running: false })
  },

  reset: () => {
    const { cpu, stop } = get()
    stop() // Make sure we stop any running execution
    cpu.reset()

    set({
      pc: cpu.pc,
      instruction: 0, // No instruction yet
      cycle: 0,
      registers: cpu.registerFile,
    })
  },

  getMemoryAt: (address, length) => {
    const { memory } = get()
    const buffer = new Uint8Array(length)
    memory.dumpToBuffer(address, length, buffer)
    return buffer
  },
}))

export default useCpuStore
