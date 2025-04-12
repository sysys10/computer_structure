import { Memory } from './memory'

export enum ExceptionCode {
  NONE = 0,
  INVALID_INST = 1,
  INT_OVERFLOW = 2,
  PC_ALIGN = 4,
  DATA_ALIGN = 8,
  BRANCH_IN_DELAY_SLOT = 16,
  BREAK = 32,
  PC_LIMIT = 64,
  SYSCALL = 128,
}

export class CPU {
  private mem: Memory
  public pc: number = 0x00040000
  public cycle: number = 0
  public registerFile: Uint32Array = new Uint32Array(32)
  private branchTarget?: number
  public halted: boolean = false
  private eventListeners: Map<string, any[]> = new Map()

  constructor(memory: Memory) {
    this.mem = memory
    this.reset()
  }

  /**
   * Resets the CPU state
   */
  reset(): void {
    this.cycle = 0
    this.pc = 0x00040000
    this.branchTarget = undefined
    this.halted = false

    // Initialize all registers to 0
    for (let i = 0; i < 32; i++) {
      this.registerFile[i] = 0
    }

    // Set up initial values for special registers
    this.registerFile[28] = 0x10008000 // $gp
    this.registerFile[29] = 0x7ffffffc // $sp
  }

  /**
   * Executes a single instruction
   * @returns An exception code if an exception occurred, or 0 if no exception
   */
  step(): ExceptionCode {
    const mem = this.mem
    const r = this.registerFile
    const inst = mem.getWord(this.pc)

    // Register $0 is hardwired to 0
    r[0] = 0

    // Decode instruction fields
    const opcode = (inst & 0xfc000000) >>> 26
    const func = inst & 0x3f
    const rs = (inst & 0x03e00000) >>> 21
    const rt = (inst & 0x001f0000) >>> 16
    const rd = (inst & 0x0000f800) >>> 11
    const shamt = (inst & 0x000007c0) >>> 6
    const imm = inst & 0xffff
    // Sign-extended immediate value
    const imms = imm & 0x8000 ? imm | 0xffff0000 : imm

    let tmp = 0
    let hasDelaySlot = false
    let nextPC = this.pc + 4
    let exception = ExceptionCode.NONE

    this.cycle++

    // Decode and execute instruction
    switch (opcode) {
      case 0: // R-type instructions
        switch (func) {
          case 0: // sll rd, rt, sa
            r[rd] = r[rt] << shamt
            break
          case 2: // srl rd, rt, sa
            r[rd] = r[rt] >>> shamt
            break
          case 3: // sra rd, rt, sa
            r[rd] = r[rt] >> shamt
            break
          case 4: // sllv rd, rt, rs
            r[rd] = r[rt] << (r[rs] & 0x1f)
            break
          case 6: // srlv rd, rt, rs
            r[rd] = r[rt] >>> (r[rs] & 0x1f)
            break
          case 7: // srav rd, rt, rs
            r[rd] = r[rt] >> (r[rs] & 0x1f)
            break
          case 8: // jr rs
            nextPC = r[rs]
            hasDelaySlot = true
            break
          case 12: // syscall
            this.halted = true
            return ExceptionCode.SYSCALL
          case 13: // break
            exception |= ExceptionCode.BREAK
            break
          case 32: // add rd, rs, rt (with overflow check)
            tmp = (r[rs] | 0) + (r[rt] | 0)
            if (tmp > 0x7fffffff || tmp < -0x80000000) {
              exception |= ExceptionCode.INT_OVERFLOW
            }
            r[rd] = tmp
            break
          case 33: // addu rd, rs, rt
            r[rd] = r[rs] + r[rt]
            break
          case 34: // sub rd, rs, rt (with overflow check)
            tmp = (r[rs] | 0) - (r[rt] | 0)
            if (tmp > 0x7fffffff || tmp < -0x80000000) {
              exception |= ExceptionCode.INT_OVERFLOW
            }
            r[rd] = tmp
            break
          case 35: // subu rd, rs, rt
            r[rd] = r[rs] - r[rt]
            break
          case 36: // and rd, rs, rt
            r[rd] = r[rs] & r[rt]
            break
          case 37: // or rd, rs, rt
            r[rd] = r[rs] | r[rt]
            break
          case 38: // xor rd, rs, rt
            r[rd] = r[rs] ^ r[rt]
            break
          case 39: // nor rd, rs, rt
            r[rd] = ~(r[rs] | r[rt])
            break
          case 42: // slt rd, rs, rt
            r[rd] = (r[rs] | 0) < (r[rt] | 0) ? 1 : 0
            break
          case 43: // sltu rd, rs, rt
            r[rd] = r[rs] < r[rt] ? 1 : 0
            break
          default:
            exception |= ExceptionCode.INVALID_INST
        }
        break

      case 2: // j target
        tmp = this.pc
        tmp = (tmp & 0xf0000000) | ((inst & 0x03ffffff) << 2)
        nextPC = tmp < 0 ? tmp + 4294967296 : tmp
        hasDelaySlot = true
        break

      case 3: // jal target
        tmp = this.pc
        tmp = (tmp & 0xf0000000) | ((inst & 0x03ffffff) << 2)
        this.registerFile[31] = nextPC
        nextPC = tmp < 0 ? tmp + 4294967296 : tmp
        hasDelaySlot = true
        break

      case 4: // beq rs, rt, offset
        if (r[rs] === r[rt]) {
          nextPC = this.pc + (imms << 2)
          hasDelaySlot = true
        }
        break

      case 8: // addi rt, rs, imm (with overflow check)
        tmp = (r[rs] | 0) + imms
        if (tmp > 0x7fffffff || tmp < -0x80000000) {
          exception |= ExceptionCode.INT_OVERFLOW
        }
        r[rt] = tmp
        break

      case 9: // addiu rt, rs, imm
        r[rt] = r[rs] + imms
        break

      case 12: // andi rt, rs, imm
        r[rt] = r[rs] & imm // Zero extended immediate
        break

      case 13: // ori rt, rs, imm
        r[rt] = r[rs] | imm // Zero extended immediate
        break

      case 14: // xori rt, rs, imm
        r[rt] = r[rs] ^ imm // Zero extended immediate
        break

      case 15: // lui rt, imm
        r[rt] = imm << 16
        break

      case 35: // lw rt, offset(rs)
        tmp = r[rs] + imms // Calculate effective address
        if (tmp & 0x3) {
          exception |= ExceptionCode.DATA_ALIGN
        } else {
          r[rt] = mem.getWord(tmp)
        }
        break

      case 43: // sw rt, offset(rs)
        tmp = r[rs] + imms // Calculate effective address
        if (tmp & 0x3) {
          exception |= ExceptionCode.DATA_ALIGN
        } else {
          mem.setWord(tmp, r[rt])
        }
        break

      default:
        exception |= ExceptionCode.INVALID_INST
    }

    // Handle branch target (for delay slots)
    if (this.branchTarget !== undefined) {
      this.pc = this.branchTarget
      this.branchTarget = undefined
      return exception
    }

    // Ensure PC is properly aligned
    if (nextPC & 0x3) {
      exception |= ExceptionCode.PC_ALIGN
      nextPC += 4 - (nextPC & 0x3)
    }

    // Update PC
    this.pc = nextPC

    return exception
  }

  /**
   * Dumps the register file
   * @param buffer Optional buffer to receive the register values
   */
  dumpRegisterFile(buffer?: Uint32Array): void {
    if (buffer) {
      for (let i = 0; i < 32; i++) {
        buffer[i] = this.registerFile[i]
      }
    } else {
      return Array.from(this.registerFile) as any
    }
  }

  /**
   * Registers an event listener
   * @param event Event name
   * @param callback Callback function
   */
  addEventListener(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  /**
   * Emits an event
   * @param event Event name
   * @param args Arguments to pass to listeners
   */
  emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      for (const listener of listeners) {
        listener(...args)
      }
    }
  }
}
