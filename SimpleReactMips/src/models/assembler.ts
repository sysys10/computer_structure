export interface AssemblerResult {
  dataStart: number
  textStart: number
  dataSize: number
  textSize: number
  dataMem: number[]
  textMem: number[]
  sourceMap: number[]
  symbolTable: Record<string, number>
}

const TOKEN_PATTERNS = [
  { name: 'SPECIAL', regex: /^\.\w+/ },
  { name: 'LABEL', regex: /^(\w+):/ },
  { name: 'STRING', regex: /^"(([^\\"]|\\.)*)"/ },
  { name: 'COMMA', regex: /^\s*,\s*/ },
  { name: 'SPACE', regex: /^\s+/ },
  { name: 'REGOPR', regex: /^(\$\w{1,2}|zero)/ },
  { name: 'COMOPR', regex: /^(-*\d*)\((\$\w{1,2}|zero)\)/ },
  { name: 'INTEGER', regex: /^(0x[\da-f]+|-*\d+|'([^'\\]|\\*)')/ },
  { name: 'WORD', regex: /^(\w+)(?!:)/ },
]

const INSTRUCTION_PATTERNS: Record<string, [string, string, string]> = {
  add: ['0000 00ss ssst tttt dddd d000 0010 0000', 'RRR', 'N'],
  addi: ['0010 00ss ssst iiii iiii iiii iiii', 'RI', 'S'],
  sub: ['0000 00ss ssst tttt dddd d000 0010 0010', 'RRR', 'N'],
  and: ['0000 00ss ssst tttt dddd d000 0010 0100', 'RRR', 'N'],
  or: ['0000 00ss ssst tttt dddd d000 0010 0101', 'RRR', 'N'],
  lw: ['1000 11ss ssst tttt iiii iiii iiii iiii', 'RC', 'S'],
  sw: ['1010 11ss ssst tttt iiii iiii iiii iiii', 'RC', 'S'],
  // Many more instructions would be defined here
}

/**
 * Tokenize a line of MIPS assembly code
 */
function tokenize(line: string): any[] {
  const tokens = []
  let remaining = line

  while (remaining.length > 0) {
    let matched = false

    for (const pattern of TOKEN_PATTERNS) {
      const match = remaining.match(pattern.regex)
      if (match && match[0]) {
        let value: any = match[0]

        // Process value based on token type
        switch (pattern.name) {
          case 'STRING':
            value = match[1] // Extract the string content
            break
          case 'WORD':
          case 'LABEL':
            value = match[1].toLowerCase()
            break
          case 'COMOPR':
            value = {
              offset: parseInt(match[1] || '0'),
              register: match[2].toLowerCase(),
            }
            break
          case 'INTEGER':
            if (match[2]) {
              // Character constant
              value = match[2].charCodeAt(0)
            } else if (match[1].startsWith('0x')) {
              value = parseInt(match[1].substring(2), 16)
            } else {
              value = parseInt(match[1])
            }
            break
        }

        tokens.push({ type: pattern.name, value })
        remaining = remaining.slice(match.index! + match[0].length)
        matched = true
        break
      }
    }

    if (!matched) {
      throw new Error(`Unexpected syntax at: ${remaining}`)
    }
  }

  return tokens
}

/**
 * Convert a register name to its numeric index
 */
function convertRegName(name: string): number {
  // GPRs only
  const regAliases = [
    'zero',
    'at',
    'v0',
    'v1',
    'a0',
    'a1',
    'a2',
    'a3',
    't0',
    't1',
    't2',
    't3',
    't4',
    't5',
    't6',
    't7',
    's0',
    's1',
    's2',
    's3',
    's4',
    's5',
    's6',
    's7',
    't8',
    't9',
    'k0',
    'k1',
    'gp',
    'sp',
    'fp',
    'ra',
  ]

  if (name === 'zero') {
    return 0
  }

  const idx = regAliases.indexOf(name)
  if (idx >= 0) {
    return idx
  }

  // Handle $0-$31 format
  const match = name.match(/\d+/)
  if (match) {
    const num = parseInt(match[0])
    if (num >= 0 && num < 32) {
      return num
    }
  }

  throw new Error(`Invalid register name: ${name}`)
}

/**
 * Simple implementation to assemble MIPS code
 * This is a stub that would need to be fully implemented
 */
export function assemble(source: string): AssemblerResult {
  try {
    // Preprocess the source code
    const lines = source
      .split('\n')
      .map(
        (line) => line.replace(/#.*$/, '').trim(), // Remove comments
      )
      .filter((line) => line.length > 0)

    // A real implementation would parse the code, build a symbol table,
    // and translate each instruction to machine code

    // For this simplified version, we'll just return a mock result
    const textSize = lines.length * 4 // 4 bytes per instruction

    return {
      dataStart: 0x10000000,
      textStart: 0x00040000,
      dataSize: 64, // Fixed size for demonstration
      textSize,
      dataMem: Array(16).fill(0), // 64 bytes = 16 words
      textMem: Array(lines.length).fill(0x00000000), // Placeholder instructions
      sourceMap: Array(lines.length).fill(0),
      symbolTable: {}, // Empty symbol table
    }
  } catch (error) {
    throw new Error(`Assembly error: ${(error as Error).message}`)
  }
}

/**
 * Disassemble a MIPS machine code instruction to its assembly representation
 * This is a simplified implementation
 */
export function disassemble(instruction: number): string {
  // This would be a complex function in the real implementation
  // For simplicity, we'll just return the hex representation
  return `0x${instruction.toString(16).padStart(8, '0')}`
}

// Export the assembler interface
export const Assembler = {
  assemble,
  disassemble,
}

export default Assembler
