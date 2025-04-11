/**
 * Formats a number as a hexadecimal string with 0x prefix and padding
 * @param n - The number to format
 * @param len - The length of the resulting hex string (not including 0x prefix)
 * @returns A formatted hex string like 0x00001234
 */
export function formatHex(n: number, len: number = 8): string {
  if (n === undefined || n === null) return '0x00000000'

  // Handle negative numbers
  let value = n
  if (value < 0) {
    value = 0xffffffff + value + 1
  }

  const hex = value.toString(16).toUpperCase().padStart(len, '0')
  return `0x${hex}`
}

/**
 * Formats a byte value as a two-character hex string
 * @param n - The byte value to format
 * @returns A formatted hex string like "3F"
 */
export function formatByte(n: number): string {
  return (n & 0xff).toString(16).padStart(2, '0')
}

/**
 * Parses a hexadecimal or register reference string into a number
 * @param value - The string to parse (e.g., "0x1000", "$sp", "$pc")
 * @param registers - The current register values for resolving register references
 * @param pc - The current program counter (used for $pc reference)
 * @returns The parsed numeric value
 */
export function parseAddress(value: string, registers: number[], pc: number): number {
  const trimmed = value.trim().toLowerCase()

  if (trimmed === '$sp') {
    return registers[29] // Stack pointer is register 29
  }

  if (trimmed === '$pc') {
    return pc
  }

  // Handle hex value with or without 0x prefix
  const hexMatch = trimmed.match(/^(0x)?([0-9a-f]+)$/i)
  if (hexMatch) {
    return parseInt(hexMatch[2], 16)
  }

  throw new Error(`Invalid address format: ${value}`)
}

/**
 * Converts an array of string arguments to a register index
 * @param args - The array of argument strings
 * @param index - Which argument to parse
 * @returns The register index (0-31)
 */
export function getRegisterIndex(args: string[], index: number): number {
  if (index >= args.length) {
    throw new Error(`Missing argument at position ${index}`)
  }

  const regArg = args[index].trim().toLowerCase()

  // Handle $0-$31 format
  const numMatch = regArg.match(/^\$(\d+)$/)
  if (numMatch) {
    const regNum = parseInt(numMatch[1], 10)
    if (regNum >= 0 && regNum <= 31) {
      return regNum
    }
  }

  // Handle $zero, $at, etc. format
  const regNames = [
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

  const namedMatch = regArg.match(/^\$(\w+)$/)
  if (namedMatch) {
    const regName = namedMatch[1]
    const regIndex = regNames.indexOf(regName)
    if (regIndex >= 0) {
      return regIndex
    }
  }

  throw new Error(`Invalid register reference: ${regArg}`)
}
