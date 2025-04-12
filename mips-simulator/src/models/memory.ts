const CHUNK_SIZE = 65536 // in bytes
const CHUNK_MASK = CHUNK_SIZE - 1
const CHUNK_WIDTH = 16

export class Memory {
  private chunks: Uint8Array[] = []

  /**
   * Gets a memory chunk at the specified address, creating it if it doesn't exist
   */
  private getChunk(addr: number): Uint8Array {
    const chunkIndex = addr >>> CHUNK_WIDTH

    if (!this.chunks[chunkIndex]) {
      this.chunks[chunkIndex] = new Uint8Array(CHUNK_SIZE)
    }

    return this.chunks[chunkIndex]
  }

  /**
   * Gets a 32-bit word from memory
   * Big-endian: 0x11223344 -> [addr] 11 22 33 44
   */
  getWord(addr: number): number {
    const chunk = this.getChunk(addr)
    addr &= CHUNK_MASK

    // Combine bytes into a word (big-endian)
    // Low address = high bits
    const value = (chunk[addr] << 24) | (chunk[addr + 1] << 16) | (chunk[addr + 2] << 8) | chunk[addr + 3]

    // Handle JS integer representation
    return value < 0 ? 4294967296 + value : value
  }

  /**
   * Gets a 16-bit half-word from memory
   */
  getHalfword(addr: number): number {
    const chunk = this.getChunk(addr)
    addr &= CHUNK_MASK

    return (chunk[addr] << 8) | chunk[addr + 1]
  }

  /**
   * Gets a byte from memory
   */
  getByte(addr: number): number {
    return this.getChunk(addr)[addr & CHUNK_MASK]
  }

  /**
   * Sets a 32-bit word in memory
   */
  setWord(addr: number, val: number): void {
    const chunk = this.getChunk(addr)
    addr &= CHUNK_MASK

    chunk[addr] = (val & 0xff000000) >>> 24
    chunk[addr + 1] = (val & 0x00ff0000) >>> 16
    chunk[addr + 2] = (val & 0x0000ff00) >>> 8
    chunk[addr + 3] = val & 0x000000ff
  }

  /**
   * Sets a 16-bit half-word in memory
   */
  setHalfword(addr: number, val: number): void {
    const chunk = this.getChunk(addr)
    addr &= CHUNK_MASK
    val &= 0xffff

    chunk[addr] = (val & 0xff00) >>> 8
    chunk[addr + 1] = val & 0x00ff
  }

  /**
   * Sets a byte in memory
   */
  setByte(addr: number, val: number): void {
    this.getChunk(addr)[addr & CHUNK_MASK] = val & 0xff
  }

  /**
   * Dumps a range of memory to a buffer
   * @param start Starting address
   * @param length Number of bytes to dump
   * @param buffer Buffer to receive the data
   */
  dumpToBuffer(start: number, length: number, buffer: Uint8Array): void {
    let sourceIndex = start
    const endIndex = sourceIndex + length

    for (let destIndex = 0; sourceIndex < endIndex; sourceIndex++, destIndex++) {
      buffer[destIndex] = this.getByte(sourceIndex)
    }
  }

  /**
   * Imports assembly result into memory
   * @param asmResult The assembly result object
   */
  importAsm(asmResult: {
    dataStart: number
    textStart: number
    dataSize: number
    textSize: number
    dataMem: number[]
    textMem: number[]
  }): void {
    // Import data section
    let addr = asmResult.dataStart
    for (let i = 0; i < asmResult.dataMem.length; i++) {
      this.setWord(addr, asmResult.dataMem[i])
      addr += 4
    }

    // Import text section (code)
    addr = asmResult.textStart
    for (let i = 0; i < asmResult.textMem.length; i++) {
      this.setWord(addr, asmResult.textMem[i])
      addr += 4
    }
  }
}
