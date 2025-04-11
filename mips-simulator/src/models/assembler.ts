import { MIPS_INSTRUCTIONS, NUM_REG_MAP, REG_MAP, regexps, TOKEN_NAME, TOKEN_TYPE } from '@/constants/assembly.constant'
import {
  AssemblerConfig,
  AssemblyResult,
  ParsedLineInfo,
  StatusTable,
  SymbolTable,
  Token,
  UnresolvedMachineCode,
} from '@/types' // 가정: types 파일에 Token, AssemblerConfig 정의됨

// --- Constants ---

// --- Helper Functions ---

function getRegNum(regName: string, lineNo: number): number {
  const translatedRegName = NUM_REG_MAP.find((obj) => Object.keys(obj)[0] === regName)?.[regName] ?? regName
  const lowerRegName = translatedRegName.toLowerCase()

  const num = REG_MAP[lowerRegName]
  if (num === undefined) {
    throw new Error(`L${lineNo}: Invalid register name "${regName}"`)
  }
  return num
}

function parseIntValue(valStr: string, lineNo: number): number | string {
  const lowerValStr = valStr.toLowerCase()
  if (lowerValStr.startsWith('0x')) {
    return parseInt(lowerValStr, 16)
  } else if (valStr.startsWith("'") && valStr.endsWith("'") && valStr.length >= 3) {
    // Handle character literal with basic escapes
    const charContent = valStr.slice(1, -1)
    if (charContent.length === 1) {
      return charContent.charCodeAt(0)
    } else if (charContent.length === 2 && charContent.startsWith('\\')) {
      switch (charContent[1]) {
        case 'n':
          return '\n'.charCodeAt(0)
        case 't':
          return '\t'.charCodeAt(0)
        case '\\':
          return '\\'.charCodeAt(0)
        case "'":
          return "'".charCodeAt(0)
        case '"':
          return '"'.charCodeAt(0) // Added double quote escape
        case '0':
          return '\0'.charCodeAt(0) // Null terminator escape
        default:
          throw new Error(`L${lineNo}: Unsupported escape sequence: '${charContent}'`)
      }
    } else {
      throw new Error(`L${lineNo}: Invalid character literal: ${valStr}`)
    }
  } else if (/^-?\d+$/.test(valStr)) {
    // Check if it's a valid decimal integer string
    return parseInt(valStr, 10)
  } else if (/^[a-z_]\w*$/i.test(valStr)) {
    // Assumed to be a label if it's a valid identifier format and not a number
    // Return the original string (case might matter for symbols depending on assembler rules)
    return valStr // Keep original case for labels potentially
  } else {
    throw new Error(`L${lineNo}: Cannot parse value "${valStr}" as integer, char, or label.`)
  }
}

function handleStringEscapes(str: string): string {
  // More robust escape handling can be added here
  return str
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\0/g, '\0')
}

// --- Tokenize Function (TypeScript Version) ---
function tokenize(line: string): Token[] {
  const tokenList: Token[] = []
  let remainingLine = line

  while (remainingLine.length > 0) {
    let matched = false
    for (let i = 0; i < regexps.length; i++) {
      const { n: tokenName, r: regex } = regexps[i]
      const match = remainingLine.match(regex)

      if (match && match[0]) {
        const matchedText = match[0]
        const token: Partial<Token> = { type: i } // Use Partial for incremental building

        // Consume whitespace and commas without adding to token list
        if (tokenName === 'SPACE' || tokenName === 'COMMA') {
          remainingLine = remainingLine.slice(matchedText.length)
          matched = true
          break // Move to next part of the line
        }

        // Process other tokens
        switch (tokenName) {
          case 'STRING':
            token.value = handleStringEscapes(match[1]) // Store content without quotes
            break
          case 'WORD':
          case 'SPECIAL':
            token.value = match[1].toLowerCase() // Lowercase instructions/directives
            break
          case 'REGOPR':
            token.value = match[1].toLowerCase() // Lowercase registers
            break
          case 'LABEL':
            token.value = match[1] // Keep original case for labels? Or lowercase? Let's lowercase.
            token.type = TOKEN_TYPE.LABEL // Ensure type is correct
            break
          case 'COMOPR':
            token.offset = parseInt(match[1] || '0', 10)
            token.value = match[2].toLowerCase()
            break
          case 'INTEGER':
            // Let parseIntValue handle conversion/label detection in parseLine
            token.value = match[1] // Store the raw matched string ('5', '0xff', "'c'")
            break
          default: // Should not happen with exhaustive regexps
            console.warn(`Tokenizer encountered unexpected token name: ${tokenName}`)
            token.value = matchedText.toLowerCase()
            break
        }

        tokenList.push(token as Token) // Add the fully formed token
        remainingLine = remainingLine.slice(matchedText.length)
        matched = true
        break // Exit inner loop once a token is matched
      }
    }
    if (!matched) {
      // If no token matched, there's a syntax error
      throw new Error(`Unexpected syntax starting at: "${remainingLine.substring(0, 10)}..."`)
    }
  }
  return tokenList
}

// --- ParseLine Function (TypeScript Version) ---
function parseLine(tokens: Token[], lineNo: number, symbols: SymbolTable, status: StatusTable): ParsedLineInfo {
  let currentAddr = status.currentSegment === 'text' ? status.textAddr : status.dataAddr
  const lineInfo: ParsedLineInfo = {
    addr: currentAddr,
    line: lineNo,
    size: 0,
    machineCode: null,
    dataValues: [],
    symbol: null,
    isData: status.currentSegment === 'data',
    directive: null,
    instruction: null,
    operands: [],
  }

  let tokenIndex = 0

  // 1. Check for Label Definition
  if (tokens[tokenIndex]?.type === TOKEN_TYPE.LABEL) {
    const label = tokens[tokenIndex].value as string
    if (symbols[label.toLowerCase()] !== undefined) {
      // Check lowercase for consistency
      throw new Error(`L${lineNo}: Label "${label}" already defined.`)
    }
    symbols[label.toLowerCase()] = currentAddr // Store lowercase label
    lineInfo.symbol = label // Keep original case if needed for source mapping?
    tokenIndex++
  }

  // If only a label exists on the line, return
  if (tokenIndex >= tokens.length) {
    return lineInfo // No size increase for label alone
  }

  const currentToken = tokens[tokenIndex]

  // 2. Check for Assembler Directives
  if (currentToken.type === TOKEN_TYPE.SPECIAL) {
    const directive = currentToken.value as string
    lineInfo.directive = directive
    tokenIndex++
    // Assume data unless .text directive
    lineInfo.isData = true

    switch (directive) {
      case '.data':
        status.currentSegment = 'data'
        // Potential alignment adjustment might be needed depending on the *previous* segment's end
        // For simplicity, we assume segments start aligned or alignment handled by .align
        currentAddr = status.dataAddr
        lineInfo.addr = currentAddr
        lineInfo.isData = true
        break
      case '.text':
        status.currentSegment = 'text'
        currentAddr = status.textAddr
        lineInfo.addr = currentAddr
        lineInfo.isData = false
        break
      case '.word': {
        // Store 32-bit values
        lineInfo.isData = true
        while (tokenIndex < tokens.length) {
          if (tokens[tokenIndex].type === TOKEN_TYPE.INTEGER || tokens[tokenIndex].type === TOKEN_TYPE.WORD) {
            lineInfo.dataValues.push(tokens[tokenIndex].value as string) // Store raw value/label string
          } else {
            throw new Error(
              `L${lineNo}: Expected integer or label for .word directive, got ${TOKEN_NAME[tokens[tokenIndex].type]}`,
            )
          }
          tokenIndex++
        }
        if (lineInfo.dataValues.length === 0)
          throw new Error(`L${lineNo}: .word directive requires at least one value.`)
        // Ensure word alignment
        status.dataAddr = (status.dataAddr + 3) & ~3
        lineInfo.addr = status.dataAddr // Update addr after alignment
        lineInfo.size = lineInfo.dataValues.length * 4
        status.dataAddr += lineInfo.size
        break
      }
      case '.half': {
        lineInfo.isData = true
        while (tokenIndex < tokens.length) {
          if (tokens[tokenIndex].type === TOKEN_TYPE.INTEGER || tokens[tokenIndex].type === TOKEN_TYPE.WORD) {
            lineInfo.dataValues.push(tokens[tokenIndex].value as string)
          } else {
            throw new Error(
              `L${lineNo}: Expected integer or label for .half directive, got ${TOKEN_NAME[tokens[tokenIndex].type]}`,
            )
          }
          tokenIndex++
        }
        if (lineInfo.dataValues.length === 0)
          throw new Error(`L${lineNo}: .half directive requires at least one value.`)
        // Ensure half-word alignment
        status.dataAddr = (status.dataAddr + 1) & ~1
        lineInfo.addr = status.dataAddr
        lineInfo.size = lineInfo.dataValues.length * 2 // Size in bytes
        status.dataAddr += lineInfo.size
        break
      }
      case '.byte': {
        lineInfo.isData = true
        while (tokenIndex < tokens.length) {
          if (tokens[tokenIndex].type === TOKEN_TYPE.INTEGER || tokens[tokenIndex].type === TOKEN_TYPE.WORD) {
            lineInfo.dataValues.push(tokens[tokenIndex].value as string)
          } else {
            throw new Error(
              `L${lineNo}: Expected integer or label for .byte directive, got ${TOKEN_NAME[tokens[tokenIndex].type]}`,
            )
          }
          tokenIndex++
        }
        if (lineInfo.dataValues.length === 0)
          throw new Error(`L${lineNo}: .byte directive requires at least one value.`)
        lineInfo.size = lineInfo.dataValues.length // Size in bytes
        status.dataAddr += lineInfo.size
        break
      }
      case '.space': {
        lineInfo.isData = true
        if (tokenIndex >= tokens.length || tokens[tokenIndex].type !== TOKEN_TYPE.INTEGER) {
          throw new Error(`L${lineNo}: .space directive requires an integer size.`)
        }
        const sizeVal = parseIntValue(tokens[tokenIndex].value as string, lineNo)
        if (typeof sizeVal !== 'number' || sizeVal < 0) {
          throw new Error(`L${lineNo}: Invalid size for .space directive: ${tokens[tokenIndex].value}`)
        }
        tokenIndex++
        lineInfo.size = sizeVal
        status.dataAddr += lineInfo.size // No data values stored, just reserve space
        break
      }
      case '.asciiz':
      case '.ascii': {
        lineInfo.isData = true
        if (tokenIndex >= tokens.length || tokens[tokenIndex].type !== TOKEN_TYPE.STRING) {
          throw new Error(`L${lineNo}: ${directive} directive requires a string literal.`)
        }
        const str = tokens[tokenIndex].value as string // Already processed escapes in tokenize
        tokenIndex++
        // Convert string to byte values
        for (let i = 0; i < str.length; i++) {
          lineInfo.dataValues.push(str.charCodeAt(i))
        }
        if (directive === '.asciiz') {
          lineInfo.dataValues.push(0) // Null terminator
        }
        lineInfo.size = lineInfo.dataValues.length // Size in bytes
        status.dataAddr += lineInfo.size
        break
      }
      case '.align': {
        lineInfo.isData = true // Alignment affects the current segment's address
        if (tokenIndex >= tokens.length || tokens[tokenIndex].type !== TOKEN_TYPE.INTEGER) {
          throw new Error(`L${lineNo}: .align directive requires an integer alignment factor (power of 2).`)
        }
        const alignFactor = parseIntValue(tokens[tokenIndex].value as string, lineNo)
        if (typeof alignFactor !== 'number' || alignFactor < 0) {
          // Factor is power, not bytes
          throw new Error(`L${lineNo}: Alignment factor for .align must be a non-negative integer.`)
        }
        tokenIndex++
        const alignment = 1 << alignFactor // Alignment boundary in bytes (2^factor)
        const currentAddrRef = status.currentSegment === 'text' ? 'textAddr' : 'dataAddr'
        const oldAddr = status[currentAddrRef]
        const newAddr = (oldAddr + alignment - 1) & ~(alignment - 1)
        status[currentAddrRef] = newAddr
        lineInfo.addr = newAddr // The line "starts" at the aligned address
        lineInfo.size = newAddr - oldAddr // Size is the padding added
        // Padding bytes (zeros) don't need explicit storage in dataValues here
        break
      }
      // TODO: Add other directives like .globl, .extern, etc.
      default:
        console.warn(`L${lineNo}: Directive "${directive}" not fully implemented, ignoring.`)
        // Skip remaining tokens on this line for unknown directives? Or throw error?
        while (tokenIndex < tokens.length) tokenIndex++ // Consume rest of line
        break
    }
  }
  // 3. Check for Instructions
  else if (currentToken.type === TOKEN_TYPE.WORD) {
    const instructionName = (currentToken.value as string).toLowerCase() // Use lowercase for lookup
    lineInfo.instruction = instructionName
    tokenIndex++

    if (status.currentSegment !== 'text') {
      throw new Error(`L${lineNo}: Instruction "${instructionName}" found in data segment.`)
    }
    lineInfo.isData = false
    // Ensure text address is word-aligned before placing instruction
    status.textAddr = (status.textAddr + 3) & ~3
    lineInfo.addr = status.textAddr // Update line addr after potential alignment

    const instructionInfo = MIPS_INSTRUCTIONS[instructionName]

    // --- Basic Pseudo-instruction Handling ---
    // More complex pseudo-instructions (like li, la) often require inserting *multiple*
    // instructions, which complicates this single-line parser. A common approach
    // is to handle pseudo-instruction expansion *before* this pass or have parseLine
    // return multiple ParsedLineInfo objects.
    // Here's a simplified handling for `nop` and `move`.
    if (instructionName === 'nop') {
      if (tokenIndex < tokens.length) {
        throw new Error(`L${lineNo}: 'nop' instruction takes no operands.`)
      }
      lineInfo.machineCode = 0x00000000 // sll $zero, $zero, 0
      lineInfo.size = 4
      status.textAddr += lineInfo.size
      return lineInfo // Done with this line
    } else if (instructionName === 'move') {
      // move $rt, $rs => addu $rt, $rs, $zero
      if (
        tokenIndex + 1 >= tokens.length ||
        tokens[tokenIndex].type !== TOKEN_TYPE.REGOPR ||
        tokens[tokenIndex + 1].type !== TOKEN_TYPE.REGOPR
      ) {
        throw new Error(`L${lineNo}: Invalid operands for 'move'. Expected: move $rt, $rs`)
      }
      const rtRegStr = tokens[tokenIndex].value as string
      const rsRegStr = tokens[tokenIndex + 1].value as string
      lineInfo.operands = [rtRegStr, rsRegStr]
      const rt = getRegNum(rtRegStr, lineNo)
      const rs = getRegNum(rsRegStr, lineNo)
      const rd = rt // In MIPS addu, destination is the first register listed for move
      const r_rs = rs // Source 1
      const r_rt = 0 // Source 2 ($zero)
      tokenIndex += 2

      const adduInfo = MIPS_INSTRUCTIONS.addu
      lineInfo.machineCode = (adduInfo.opcode << 26) | (r_rs << 21) | (r_rt << 16) | (rd << 11) | adduInfo.funct!
      lineInfo.size = 4
      status.textAddr += lineInfo.size
      return lineInfo
    } else if (instructionName === 'li') {
      // Requires two instructions (lui, ori) - cannot be handled cleanly here.
      throw new Error(
        `L${lineNo}: Pseudo-instruction 'li' requires multi-instruction expansion which is complex for this parser structure. Consider using lui/ori manually.`,
      )
    } else if (instructionName === 'la') {
      // Requires two instructions (lui, ori) - cannot be handled cleanly here.
      throw new Error(
        `L${lineNo}: Pseudo-instruction 'la' requires multi-instruction expansion which is complex for this parser structure. Consider using lui/ori manually.`,
      )
    }
    // --- End Basic Pseudo-instruction Handling ---

    if (!instructionInfo) {
      throw new Error(`L${lineNo}: Unknown instruction "${instructionName}"`)
    }

    // --- Parse Operands for Real Instructions ---
    let rs = 0,
      rt = 0,
      rd = 0,
      shamt: number | string = 0,
      imm: number | string = 0,
      target: number | string = 0
    const operandsRaw: (string | number | Token)[] = [] // Store raw tokens/values

    try {
      // Wrap operand parsing in try-catch for better error messages
      switch (instructionInfo.format) {
        case 'RRR': // add $rd, $rs, $rt
          if (
            tokenIndex + 2 >= tokens.length ||
            tokens[tokenIndex].type !== TOKEN_TYPE.REGOPR ||
            tokens[tokenIndex + 1].type !== TOKEN_TYPE.REGOPR ||
            tokens[tokenIndex + 2].type !== TOKEN_TYPE.REGOPR
          ) {
            throw new Error(`Expected operands $rd, $rs, $rt`)
          }
          operandsRaw.push(tokens[tokenIndex].value, tokens[tokenIndex + 1].value, tokens[tokenIndex + 2].value)
          rd = getRegNum(tokens[tokenIndex].value as string, lineNo)
          rs = getRegNum(tokens[tokenIndex + 1].value as string, lineNo)
          rt = getRegNum(tokens[tokenIndex + 2].value as string, lineNo)
          tokenIndex += 3
          lineInfo.machineCode =
            (instructionInfo.opcode << 26) |
            (rs << 21) |
            (rt << 16) |
            (rd << 11) |
            (shamt << 6) |
            instructionInfo.funct!
          break
        case 'RRI': // addi $rt, $rs, imm/label
          if (
            tokenIndex + 2 >= tokens.length ||
            tokens[tokenIndex].type !== TOKEN_TYPE.REGOPR ||
            tokens[tokenIndex + 1].type !== TOKEN_TYPE.REGOPR ||
            (tokens[tokenIndex + 2].type !== TOKEN_TYPE.INTEGER && tokens[tokenIndex + 2].type !== TOKEN_TYPE.WORD)
          ) {
            throw new Error(`Expected operands $rt, $rs, immediate/label`)
          }
          operandsRaw.push(tokens[tokenIndex].value, tokens[tokenIndex + 1].value, tokens[tokenIndex + 2].value)
          rt = getRegNum(tokens[tokenIndex].value as string, lineNo)
          rs = getRegNum(tokens[tokenIndex + 1].value as string, lineNo)
          imm = parseIntValue(tokens[tokenIndex + 2].value as string, lineNo)
          tokenIndex += 3
          // Branch instructions need label resolution in pass 2
          if (instructionInfo.opcode === 0x04 || instructionInfo.opcode === 0x05) {
            // beq, bne
            if (typeof imm === 'string') {
              lineInfo.machineCode = {
                opcode: instructionInfo.opcode,
                rs: rs,
                rt: rt,
                label: imm,
                addr: currentAddr,
                type: 'BRANCH',
              }
            } else {
              // Immediate offset (unlikely for branches)
              const offset = (imm - (currentAddr + 4)) >> 2
              if (offset > 32767 || offset < -32768)
                throw new Error(`Branch target immediate ${imm} out of 16-bit range.`)
              lineInfo.machineCode = (instructionInfo.opcode << 26) | (rs << 21) | (rt << 16) | (offset & 0xffff)
            }
          } else {
            // Other I-types
            if (typeof imm !== 'number') throw new Error(`Immediate value required, got label "${imm}".`)
            // Check range (signed 16-bit for most I-types like addi)
            if (imm > 32767 || imm < -32768) {
              // Note: addiu, sltiu treat immediate differently (unsigned comparison or no overflow)
              // andi, ori, xori use zero-extended 16-bit (0-65535)
              // Add specific checks if needed
              if (!['addiu', 'sltiu', 'andi', 'ori', 'xori'].includes(instructionName)) {
                throw new Error(`Immediate value ${imm} out of 16-bit signed range.`)
              }
              if (imm < 0 || imm > 65535) {
                // Check unsigned range for logic ops
                if (['andi', 'ori', 'xori'].includes(instructionName)) {
                  throw new Error(`Immediate value ${imm} out of 16-bit unsigned range.`)
                }
              }
            }
            lineInfo.machineCode = (instructionInfo.opcode << 26) | (rs << 21) | (rt << 16) | (imm & 0xffff)
          }
          break
        case 'RRA': // sll $rd, $rt, shamt
          if (
            tokenIndex + 2 >= tokens.length ||
            tokens[tokenIndex].type !== TOKEN_TYPE.REGOPR ||
            tokens[tokenIndex + 1].type !== TOKEN_TYPE.REGOPR ||
            tokens[tokenIndex + 2].type !== TOKEN_TYPE.INTEGER
          ) {
            throw new Error(`Expected operands $rd, $rt, shamt`)
          }
          operandsRaw.push(tokens[tokenIndex].value, tokens[tokenIndex + 1].value, tokens[tokenIndex + 2].value)
          rd = getRegNum(tokens[tokenIndex].value as string, lineNo)
          rt = getRegNum(tokens[tokenIndex + 1].value as string, lineNo)
          shamt = parseIntValue(tokens[tokenIndex + 2].value as string, lineNo)
          if (typeof shamt !== 'number' || shamt < 0 || shamt > 31)
            throw new Error(`Shift amount ${shamt} out of range (0-31).`)
          tokenIndex += 3
          lineInfo.machineCode =
            (instructionInfo.opcode << 26) |
            (rs << 21) |
            (rt << 16) |
            (rd << 11) |
            (shamt << 6) |
            instructionInfo.funct!
          break
        case 'RC': // lw $rt, offset($rs)
          if (
            tokenIndex + 1 >= tokens.length ||
            tokens[tokenIndex].type !== TOKEN_TYPE.REGOPR ||
            tokens[tokenIndex + 1].type !== TOKEN_TYPE.COMOPR
          ) {
            throw new Error(`Expected operands $rt, offset($rs)`)
          }
          operandsRaw.push(tokens[tokenIndex].value, tokens[tokenIndex + 1]) // Store complex token
          rt = getRegNum(tokens[tokenIndex].value as string, lineNo)
          imm = tokens[tokenIndex + 1].offset as number
          rs = getRegNum(tokens[tokenIndex + 1].value as string, lineNo)
          if (imm > 32767 || imm < -32768) throw new Error(`Offset ${imm} out of 16-bit range.`)
          tokenIndex += 2
          lineInfo.machineCode = (instructionInfo.opcode << 26) | (rs << 21) | (rt << 16) | (imm & 0xffff)
          break
        case 'RI': // lui $rt, imm/label
          if (
            tokenIndex + 1 >= tokens.length ||
            tokens[tokenIndex].type !== TOKEN_TYPE.REGOPR ||
            (tokens[tokenIndex + 1].type !== TOKEN_TYPE.INTEGER && tokens[tokenIndex + 1].type !== TOKEN_TYPE.WORD)
          ) {
            throw new Error(`Expected operands $rt, immediate/label`)
          }
          operandsRaw.push(tokens[tokenIndex].value, tokens[tokenIndex + 1].value)
          rt = getRegNum(tokens[tokenIndex].value as string, lineNo)
          imm = parseIntValue(tokens[tokenIndex + 1].value as string, lineNo)
          tokenIndex += 2
          if (typeof imm === 'string') {
            // Label for lui (upper 16 bits)
            lineInfo.machineCode = {
              opcode: instructionInfo.opcode,
              rt: rt,
              label: imm,
              addr: currentAddr,
              type: 'LA_LUI',
            }
          } else {
            // Immediate value
            if (imm < 0 || imm > 65535) throw new Error(`Immediate value ${imm} out of 16-bit range for lui.`)
            lineInfo.machineCode = (instructionInfo.opcode << 26) | (rt << 16) | (imm & 0xffff) // lui uses imm directly
          }
          break
        case 'R': // jr $rs
          if (tokenIndex >= tokens.length || tokens[tokenIndex].type !== TOKEN_TYPE.REGOPR) {
            throw new Error(`Expected operand $rs`)
          }
          operandsRaw.push(tokens[tokenIndex].value)
          rs = getRegNum(tokens[tokenIndex].value as string, lineNo)
          tokenIndex += 1
          lineInfo.machineCode = (instructionInfo.opcode << 26) | (rs << 21) | instructionInfo.funct!
          break
        case 'I': // j target/label
          if (
            tokenIndex >= tokens.length ||
            (tokens[tokenIndex].type !== TOKEN_TYPE.INTEGER && tokens[tokenIndex].type !== TOKEN_TYPE.WORD)
          ) {
            throw new Error(`Expected operand target/label`)
          }
          operandsRaw.push(tokens[tokenIndex].value)
          target = parseIntValue(tokens[tokenIndex].value as string, lineNo)
          tokenIndex += 1
          if (typeof target === 'string') {
            // Label
            lineInfo.machineCode = { opcode: instructionInfo.opcode, label: target, addr: currentAddr, type: 'J' }
          } else {
            // Immediate address
            if (target < 0 || target >= 2 ** 28 || target & 0x3) {
              // Check 28-bit range (after >> 2) and alignment
              throw new Error(
                `Invalid immediate jump target address ${target}. Must be word-aligned and within lower 256MB of current segment.`,
              )
            }
            const jumpAddr = (target >> 2) & 0x03ffffff
            lineInfo.machineCode = (instructionInfo.opcode << 26) | jumpAddr
          }
          break
        case 'N': // syscall, nop (already handled)
          if (instructionName === 'syscall') {
            if (tokenIndex < tokens.length) {
              throw new Error(`'syscall' instruction takes no operands.`)
            }
            lineInfo.machineCode = (instructionInfo.opcode << 26) | instructionInfo.funct!
          } else {
            // Should have been caught earlier if not 'nop' or 'syscall'
            throw new Error(`Unhandled N-format instruction: ${instructionName}`)
          }
          break
        default:
          throw new Error(`Unhandled instruction format "${instructionInfo.format}"`)
      }
    } catch (e: any) {
      // Add instruction context to operand parsing errors
      throw new Error(`L${lineNo} (${instructionName}): ${e.message}`)
    }

    lineInfo.size = 4 // All MIPS instructions are 4 bytes
    lineInfo.operands = operandsRaw
    status.textAddr += lineInfo.size // Increment text address
  }
  // 4. Handle lines with only comments (preprocessed out) or empty lines
  else if (currentToken === undefined && lineInfo.symbol === null) {
    lineInfo.size = 0 // No contribution to size
  }
  // 5. Unexpected token if not label, directive, or instruction start
  else if (currentToken !== undefined) {
    throw new Error(`L${lineNo}: Unexpected token "${currentToken.value}" (type ${TOKEN_NAME[currentToken.type]})`)
  }

  // Final check: Ensure all tokens were consumed if the line wasn't just a label/empty
  if (lineInfo.directive !== null || lineInfo.instruction !== null) {
    if (tokenIndex < tokens.length) {
      throw new Error(`L${lineNo}: Trailing unexpected token(s) starting with "${tokens[tokenIndex].value}"`)
    }
  }

  return lineInfo
}

/**
 * MIPS 어셈블리 코드를 어셈블하여 기계어로 변환합니다. (TypeScript Version)
 * @param src 소스 코드 텍스트
 * @param config 어셈블러 설정
 * @returns 어셈블 결과
 */
export function assemble(src: string, config?: AssemblerConfig): AssemblyResult {
  const dataStartAddr = config?.dataStartAddr ?? 0x10000000
  const textStartAddr = config?.textStartAddr ?? 0x00040000

  const lines: string[] = src.split('\n')
  const symbolTable: SymbolTable = {}
  const parsedLines: ParsedLineInfo[] = []
  const status: StatusTable = {
    currentSegment: 'text',
    textAddr: textStartAddr,
    dataAddr: dataStartAddr,
  }

  // --- Pass 1: Build Symbol Table and Calculate Sizes/Addresses ---
  console.log('--- Pass 1 ---')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // Basic comment/empty line skipping (preprocess should ideally handle this)
    if (line === '' || line.startsWith('#')) continue

    try {
      // console.log(`L${i + 1}: ${line}`);
      const currentTokenList = tokenize(line)
      // console.log("Tokens:", currentTokenList);
      if (currentTokenList.length === 0) continue // Skip if only whitespace/commas

      const lineInfo = parseLine(currentTokenList, i + 1, symbolTable, status)
      parsedLines.push(lineInfo)
      // console.log("Parsed:", lineInfo);
      // status.textAddr and status.dataAddr are updated within parseLine
    } catch (err: any) {
      // Add line number context if not already present
      const message = err.message.startsWith(`L${i + 1}`) ? err.message : `L${i + 1}: ${err.message}`
      throw new Error(message)
    }
  }

  const textSize = status.textAddr - textStartAddr
  const dataSize = status.dataAddr - dataStartAddr
  console.log('Symbol Table:', symbolTable)
  console.log(`Text Size: ${textSize}, Data Size: ${dataSize}`)

  // --- Pass 2: Generate Machine Code and Data ---
  console.log('--- Pass 2 ---')
  // Use ArrayBuffers and DataViews for more direct memory manipulation if needed,
  // but number arrays are simpler for this example.
  const textMem: number[] = new Array(Math.max(0, textSize / 4)).fill(0)
  const dataBytes: Uint8Array = new Uint8Array(Math.max(0, dataSize)) // Use byte array for easier packing
  const sourceMap: { [address: number]: number } = {}

  for (const lineInfo of parsedLines) {
    // Map the starting address calculated in Pass 1 to the source line
    if (lineInfo.size > 0) {
      // Only map lines that produce output
      sourceMap[lineInfo.addr] = lineInfo.line
    }

    if (lineInfo.isData && lineInfo.directive) {
      let currentDataOffset = lineInfo.addr - dataStartAddr // Byte offset from data start

      // Handle data directives requiring value resolution/packing
      if (['.word', '.half', '.byte', '.asciiz', '.ascii'].includes(lineInfo.directive)) {
        for (const valueOrLabel of lineInfo.dataValues) {
          let value: number
          if (typeof valueOrLabel === 'string') {
            value = symbolTable[valueOrLabel.toLowerCase()] // Use lowercase lookup
            if (value === undefined) {
              throw new Error(`L${lineInfo.line}: Undefined symbol "${valueOrLabel}" used in ${lineInfo.directive}.`)
            }
          } else {
            value = valueOrLabel
          }

          // Pack value based on directive
          try {
            switch (lineInfo.directive) {
              case '.word':
                if (currentDataOffset + 3 >= dataBytes.length) throw new Error('Data buffer overflow')
                // MIPS is typically Big Endian
                dataBytes[currentDataOffset++] = (value >>> 24) & 0xff
                dataBytes[currentDataOffset++] = (value >>> 16) & 0xff
                dataBytes[currentDataOffset++] = (value >>> 8) & 0xff
                dataBytes[currentDataOffset++] = value & 0xff
                break
              case '.half':
                if (currentDataOffset + 1 >= dataBytes.length) throw new Error('Data buffer overflow')
                if (value < -32768 || value > 65535)
                  console.warn(`L${lineInfo.line}: Value ${value} for .half out of typical 16-bit range.`)
                dataBytes[currentDataOffset++] = (value >>> 8) & 0xff
                dataBytes[currentDataOffset++] = value & 0xff
                break
              case '.byte':
              case '.asciiz': // Handled as bytes here
              case '.ascii':
                if (currentDataOffset >= dataBytes.length) throw new Error('Data buffer overflow')
                if (value < -128 || value > 255)
                  console.warn(`L${lineInfo.line}: Value ${value} for .byte/char out of typical 8-bit range.`)
                dataBytes[currentDataOffset++] = value & 0xff
                break
            }
          } catch (e: any) {
            throw new Error(`L${lineInfo.line}: Error packing data for ${lineInfo.directive}: ${e.message}`)
          }
        }
      }
      // .space and .align don't require writing data here (implicitly zero)
    } else if (lineInfo.instruction && lineInfo.machineCode !== null) {
      // Handle instructions - Resolve labels in machine code
      const textMemAddrOffset = (lineInfo.addr - textStartAddr) / 4
      if (textMemAddrOffset < 0 || textMemAddrOffset >= textMem.length) {
        throw new Error(
          `L${
            lineInfo.line
          }: Calculated text memory offset ${textMemAddrOffset} is out of bounds for address ${lineInfo.addr.toString(
            16,
          )}.`,
        )
      }

      if (typeof lineInfo.machineCode === 'number') {
        textMem[textMemAddrOffset] = lineInfo.machineCode
      } else {
        // It's an UnresolvedMachineCode object
        const mcInfo = lineInfo.machineCode as UnresolvedMachineCode
        const targetAddr = symbolTable[mcInfo.label.toLowerCase()] // Use lowercase lookup
        if (targetAddr === undefined) {
          throw new Error(`L${lineInfo.line}: Undefined label "${mcInfo.label}" used in instruction.`)
        }

        let finalMachineCode = 0
        switch (mcInfo.type) {
          case 'J': {
            // j, jal
            const jumpAddr = (targetAddr >> 2) & 0x03ffffff
            if (targetAddr & 0x3)
              throw new Error(
                `L${lineInfo.line}: Jump target label "${mcInfo.label}" (${targetAddr.toString(
                  16,
                )}) is not word-aligned.`,
              )
            if (((targetAddr ^ mcInfo.addr) & 0xf0000000) !== 0) {
              console.warn(
                `L${lineInfo.line}: Jump to ${mcInfo.label} (${targetAddr.toString(
                  16,
                )}) crosses a 256MB boundary from instruction at ${mcInfo.addr.toString(16)}.`,
              )
            }
            finalMachineCode = (mcInfo.opcode << 26) | jumpAddr
            break
          }
          case 'BRANCH': {
            // beq, bne
            const offset = (targetAddr - (mcInfo.addr + 4)) >> 2
            if (offset > 32767 || offset < -32768)
              throw new Error(
                `L${lineInfo.line}: Branch to label "${
                  mcInfo.label
                }" is out of 16-bit offset range from instruction at ${mcInfo.addr.toString(16)}.`,
              )
            finalMachineCode = (mcInfo.opcode << 26) | (mcInfo.rs! << 21) | (mcInfo.rt! << 16) | (offset & 0xffff)
            break
          }
          case 'LA_LUI': {
            // lui part of la pseudo-instruction (or manual lui label)
            let upperImm = targetAddr >>> 16
            if (targetAddr & 0x8000) {
              // Adjust if lower half's sign bit is set
              upperImm += 1
            }
            finalMachineCode = (mcInfo.opcode << 26) | (mcInfo.rt! << 16) | (upperImm & 0xffff)
            break
          }
          // TODO: Add LA_ORI case if needed, though ori usually uses immediate 0 for `la`
          // TODO: Handle labels used in load/store addresses if supported (e.g., lw $t0, my_var)
          default:
            throw new Error(`L${lineInfo.line}: Label resolution not implemented for this instruction type/format.`)
        }
        textMem[textMemAddrOffset] = finalMachineCode
      }
    }
  }

  // Convert dataBytes (Uint8Array) to dataMem (number[] word array)
  const dataMemWords: number[] = new Array(Math.max(0, dataSize / 4)).fill(0)
  const dataView = new DataView(dataBytes.buffer)
  for (let i = 0; i < dataMemWords.length; i++) {
    if (i * 4 + 3 < dataBytes.length) {
      // Check bounds
      // Read as Big Endian word
      dataMemWords[i] = dataView.getInt32(i * 4, false)
    } else {
      // Handle potential partial word at the end if dataSize wasn't multiple of 4
      // This shouldn't happen if alignment is correct, but good to be safe
      let partialWord = 0
      for (let j = 0; j < 4 && i * 4 + j < dataBytes.length; j++) {
        partialWord |= dataBytes[i * 4 + j] << ((3 - j) * 8)
      }
      dataMemWords[i] = partialWord
      console.warn(`Data segment size (${dataSize}) not word-aligned? Reading partial word at end.`)
    }
  }

  return {
    textStart: textStartAddr,
    dataStart: dataStartAddr,
    textSize: textSize,
    dataSize: dataSize,
    textMem: textMem,
    dataMem: dataMemWords,
    sourceMap: sourceMap,
    symbolTable: symbolTable,
  }
}
