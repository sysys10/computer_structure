/**
 * This file contains the core classes for the MIPS simulator.
 * In a real implementation, you would port the original SimpleMIPS JavaScript code.
 * This is a simplified version to demonstrate the structure.
 */

export class EventBus {
  private _bus: Record<string, Array<(...args: any[]) => void>> = {}

  /**
   * Register a handler for an event
   */
  register(eventName: string, handler: (...args: any[]) => void): void {
    if (!this._bus[eventName]) {
      this._bus[eventName] = [handler]
    } else {
      this._bus[eventName].push(handler)
    }
  }

  /**
   * Remove a handler for an event
   */
  remove(eventName: string, handler: (...args: any[]) => void): void {
    const handlers = this._bus[eventName]
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index >= 0) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * Post an event with arguments
   */
  post(eventName: string, ...args: any[]): void {
    const handlers = this._bus[eventName]
    if (handlers) {
      for (const handler of handlers) {
        handler(...args)
      }
    }
  }
}

export class Memory {
  // Memory is organized as an array of chunks
  private chunks: Uint8Array[] = []
  private CHUNK_SIZE = 65536 // in bytes
  private CHUNK_WIDTH = 16 // log2(CHUNK_SIZE)

  // For cycle-accurate simulation
  public latencyCtr = 0
  public latency = 1
  public busy = false

  /**
   * Get a chunk of memory, creating it if it doesn't exist
   */
  private getChunk(addr: number): Uint8Array {
    const chunkIndex = addr >>> this.CHUNK_WIDTH
    let chunk = this.chunks[chunkIndex]

    if (!chunk) {
      chunk = new Uint8Array(this.CHUNK_SIZE)
      this.chunks[chunkIndex] = chunk
    }

    // Set busy flag for cycle-accurate simulation
    this.busy = true

    return chunk
  }

  /**
   * Get a word (4 bytes) from memory
   */
  getWord(addr: number): number {
    const chunk = this.getChunk(addr)
    const mask = this.CHUNK_SIZE - 1
    const localAddr = addr & mask

    // Big-endian, low address = high bits
    const value =
      (chunk[localAddr] << 24) | (chunk[localAddr + 1] << 16) | (chunk[localAddr + 2] << 8) | chunk[localAddr + 3]

    // JavaScript treats numbers as signed 32-bit by default
    return value >>> 0 // Convert to unsigned
  }

  /**
   * Get a halfword (2 bytes) from memory
   */
  getHalfword(addr: number): number {
    const chunk = this.getChunk(addr)
    const mask = this.CHUNK_SIZE - 1
    const localAddr = addr & mask

    return ((chunk[localAddr] << 8) | chunk[localAddr + 1]) & 0xffff
  }

  /**
   * Get a byte from memory
   */
  getByte(addr: number): number {
    const chunk = this.getChunk(addr)
    const mask = this.CHUNK_SIZE - 1
    return chunk[addr & mask]
  }

  /**
   * Set a word (4 bytes) in memory
   */
  setWord(addr: number, val: number): void {
    const chunk = this.getChunk(addr)
    const mask = this.CHUNK_SIZE - 1
    const localAddr = addr & mask

    chunk[localAddr] = (val >>> 24) & 0xff
    chunk[localAddr + 1] = (val >>> 16) & 0xff
    chunk[localAddr + 2] = (val >>> 8) & 0xff
    chunk[localAddr + 3] = val & 0xff
  }

  /**
   * Set a halfword (2 bytes) in memory
   */
  setHalfword(addr: number, val: number): void {
    const chunk = this.getChunk(addr)
    const mask = this.CHUNK_SIZE - 1
    const localAddr = addr & mask

    val &= 0xffff
    chunk[localAddr] = (val >>> 8) & 0xff
    chunk[localAddr + 1] = val & 0xff
  }

  /**
   * Set a byte in memory
   */
  setByte(addr: number, val: number): void {
    const chunk = this.getChunk(addr)
    const mask = this.CHUNK_SIZE - 1
    chunk[addr & mask] = val & 0xff
  }

  /**
   * Update memory state for cycle-accurate simulation
   */
  step(): void {
    if (this.busy) {
      this.latencyCtr++
      if (this.latencyCtr >= this.latency) {
        this.latencyCtr = 0
        this.busy = false
      }
    }
  }

  /**
   * Import assembled code and data
   */
  importAsm(asmResult: any): void {
    // Import data segment
    let si = asmResult.dataStart
    let ei = si + asmResult.dataSize

    for (let i = si, j = 0; i < ei; i += 4, j++) {
      this.setWord(i, asmResult.dataMem[j])
    }

    // Import text segment
    si = asmResult.textStart
    ei = si + asmResult.textSize

    for (let i = si, j = 0; i < ei; i += 4, j++) {
      this.setWord(i, asmResult.textMem[j])
    }
  }
}

// Constants for the CPU
export const ALU_OP = {
  ADD: 0,
  SUB: 1,
  AND: 2,
  OR: 3,
  XOR: 4,
  NOR: 5,
  SLL: 6,
  SRL: 7,
  SRA: 8,
  SLT: 9,
  SLTU: 10,
  NOP: 11,
  MUL: 12,
  DIV: 13,
}

export const MEM_OP = {
  NOP: 0,
  RB: 1, // Read Byte
  RHW: 2, // Read Halfword
  RW: 3, // Read Word
  WB: 4, // Write Byte
  WHW: 5, // Write Halfword
  WW: 6, // Write Word
}

export const BRANCH_COND = {
  N: 0, // Unconditional
  LTZ: 1, // Less Than Zero
  GTZ: 2, // Greater Than Zero
  LTEZ: 3, // Less Than or Equal to Zero
  GTEZ: 4, // Greater Than or Equal to Zero
  EQ: 5, // Equal
  NEQ: 6, // Not Equal
}

export const EXCEPTION_CODE = {
  INVALID_INST: 1,
  INT_OVERFLOW: 2,
  PC_ALIGN: 4,
  DATA_ALIGN: 8,
  BRANCH_IN_DELAY_SLOT: 16,
  BREAK: 32,
  PC_LIMIT: 64,
  SYSCALL: 128,
}

export const STALL_FLAGS = {
  PC: 1,
  IF: 2,
  ID: 4,
  EX: 8,
  MA: 16,
  WB: 32,
}

export class CPU {
  // Core CPU state
  public pc: number = 0x00040000
  public cycle: number = 0
  public stalls: number = 0
  public registerFile: Uint32Array = new Uint32Array(32)
  public halted: boolean = false
  public eventBus: EventBus = new EventBus()

  // Memory reference
  private mem: Memory

  // Pipeline registers
  public if_id: any = { pc: 0, inst: 0 }
  public id_ex: any = {
    pc: 0,
    inst: 0,
    aluOp: ALU_OP.NOP,
    memOp: MEM_OP.NOP,
    memLdSgn: false,
    memSrc: 32,
    memVal: 0,
    oprA: 0,
    oprB: 0,
    oprASrc: 0,
    oprBSrc: 33,
    ovEn: false,
    regDst: -1,
    regSrc: 0,
    sa: 0,
    rs: 0,
    rt: 0,
    rd: 0,
    imm: 0,
  }
  public ex_ma: any = {
    pc: 0,
    inst: 0,
    aluOut: 0,
    memOp: MEM_OP.NOP,
    memLdSgn: false,
    memSrc: 32,
    memVal: 0,
    regDst: -1,
    regSrc: 0,
  }
  public ma_wb: any = {
    pc: 0,
    inst: 0,
    regDst: -1,
    regVal: 0,
  }
  public retiredPC: number = 0
  public retiredInst: number = 0

  // Debug info for pipeline view
  public debugInfo: any = {
    stallFlag: 0,
    bCond: -1,
    bCondAVal: 0,
    bCondBVal: 0,
    bCondASrc: 0,
    bCondBSrc: 0,
    bCondAFwd: undefined,
    bCondBFwd: undefined,
    bBaseSrc: 0,
    bBaseFwd: undefined,
    bTarget: 0,
    bTaken: false,
    memWSrc: undefined,
    memWVal: 0,
    memWFwd: undefined,
    aluOp: ALU_OP.NOP,
    aluA: 0,
    aluB: 0,
    aluASrc: 0,
    aluBSrc: 0,
    aluAFwd: undefined,
    aluBFwd: undefined,
    memVal: 0,
    memOp: MEM_OP.NOP,
    memAddr: 0,
    regVal: 0,
    regOp: false,
    regDst: -1,
    regSrc: 0,
  }

  constructor(memory: Memory) {
    this.mem = memory
    this.reset()
  }

  /**
   * Reset the CPU state
   */
  reset(): void {
    this.pc = 0x00040000
    this.cycle = 0
    this.stalls = 0
    this.registerFile = new Uint32Array(32)
    this.registerFile[28] = 0x10008000 // $gp
    this.registerFile[29] = 0x7ffffffc // $sp
    this.halted = false

    // Reset pipeline registers
    this.if_id = { pc: 0, inst: 0 }
    this.id_ex = {
      pc: 0,
      inst: 0,
      aluOp: ALU_OP.NOP,
      memOp: MEM_OP.NOP,
      memLdSgn: false,
      memSrc: 32,
      memVal: 0,
      oprA: 0,
      oprB: 0,
      oprASrc: 0,
      oprBSrc: 33,
      ovEn: false,
      regDst: -1,
      regSrc: 0,
      sa: 0,
      rs: 0,
      rt: 0,
      rd: 0,
      imm: 0,
    }
    this.ex_ma = {
      pc: 0,
      inst: 0,
      aluOut: 0,
      memOp: MEM_OP.NOP,
      memLdSgn: false,
      memSrc: 32,
      memVal: 0,
      regDst: -1,
      regSrc: 0,
    }
    this.ma_wb = {
      pc: 0,
      inst: 0,
      regDst: -1,
      regVal: 0,
    }
    this.retiredPC = 0
    this.retiredInst = 0

    // Reset debug info
    this.debugInfo = {
      stallFlag: 0,
      bCond: -1,
      regOp: false,
    }
  }

  /**
   * Step the CPU one cycle
   * This is a simplified version for simulation purposes
   */
  step(): number {
    // Update memory state
    this.mem.step()

    // Move instructions through the pipeline (simplified)
    this.ma_wb = { ...this.ex_ma }
    this.ex_ma = { ...this.id_ex }
    this.id_ex = { ...this.if_id, aluOp: ALU_OP.NOP, regDst: -1 }

    // Fetch new instruction
    const inst = this.mem.getWord(this.pc)
    this.if_id = { pc: this.pc, inst }

    // Increment PC
    this.pc += 4
    if (this.pc > 0xffffffff) {
      // Handle overflow
      this.pc -= 0x100000000
    }

    // Handle register write-back
    if (this.ma_wb.regDst > 0) {
      this.registerFile[this.ma_wb.regDst] = this.ma_wb.regVal
      this.debugInfo.regOp = true
      this.debugInfo.regDst = this.ma_wb.regDst
      this.debugInfo.regVal = this.ma_wb.regVal
    } else {
      this.debugInfo.regOp = false
    }

    // Ensure r0 is always 0
    this.registerFile[0] = 0

    // Update retired instruction
    this.retiredPC = this.ma_wb.pc
    this.retiredInst = this.ma_wb.inst

    // Update cycle counter
    this.cycle++

    return 0 // No exceptions
  }
}
