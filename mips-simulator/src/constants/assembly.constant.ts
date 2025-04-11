import { MipsInstructionInfo, RegisterMap } from '@/types'

const regexps: { n: string; r: RegExp }[] = [
  { n: 'SPECIAL', r: /^\.\w+/ },
  { n: 'LABEL', r: /^(\w+):/ },
  { n: 'STRING', r: /^"(([^\\"]|\\.)*)"/ },
  { n: 'COMMA', r: /^\s*,\s*/ }, // Consumed, not stored usually
  { n: 'SPACE', r: /^\s+/ }, // Consumed, not stored usually
  { n: 'REGOPR', r: /^(\$\w{1,2}|zero)/i }, // Case-insensitive match for registers
  { n: 'COMOPR', r: /^(-?\d*)\((\$\w{1,2}|zero)\)/i }, // Case-insensitive register
  { n: 'INTEGER', r: /^(0x[\da-f]+|-?\d+|'([^'\\]|\\.)')/i }, // Case-insensitive hex
  { n: 'WORD', r: /^([a-z]\w*)(?!:)/i }, // Instructions/identifiers (case-insensitive start)
]

const TOKEN_TYPE: Record<string, number> = {
  SPECIAL: 0,
  LABEL: 1,
  STRING: 2,
  COMMA: 3,
  SPACE: 4,
  REGOPR: 5,
  COMOPR: 6,
  INTEGER: 7,
  WORD: 8,
}
const TOKEN_NAME: string[] = Object.keys(TOKEN_TYPE) // For debugging

// MIPS Instruction Information (Incomplete - Add all instructions)
const MIPS_INSTRUCTIONS: Record<string, MipsInstructionInfo> = {
  // R-Type
  add: { format: 'RRR', opcode: 0x00, funct: 0x20 },
  addu: { format: 'RRR', opcode: 0x00, funct: 0x21 },
  sub: { format: 'RRR', opcode: 0x00, funct: 0x22 },
  subu: { format: 'RRR', opcode: 0x00, funct: 0x23 },
  and: { format: 'RRR', opcode: 0x00, funct: 0x24 },
  or: { format: 'RRR', opcode: 0x00, funct: 0x25 },
  xor: { format: 'RRR', opcode: 0x00, funct: 0x26 },
  nor: { format: 'RRR', opcode: 0x00, funct: 0x27 },
  slt: { format: 'RRR', opcode: 0x00, funct: 0x2a },
  sltu: { format: 'RRR', opcode: 0x00, funct: 0x2b },
  sll: { format: 'RRA', opcode: 0x00, funct: 0x00 }, // $rd, $rt, shamt
  srl: { format: 'RRA', opcode: 0x00, funct: 0x02 }, // $rd, $rt, shamt
  sra: { format: 'RRA', opcode: 0x00, funct: 0x03 }, // $rd, $rt, shamt
  sllv: { format: 'RRR', opcode: 0x00, funct: 0x04 }, // $rd, $rt, $rs
  srlv: { format: 'RRR', opcode: 0x00, funct: 0x06 }, // $rd, $rt, $rs
  srav: { format: 'RRR', opcode: 0x00, funct: 0x07 }, // $rd, $rt, $rs
  jr: { format: 'R', opcode: 0x00, funct: 0x08 }, // $rs
  syscall: { format: 'N', opcode: 0x00, funct: 0x0c },
  // I-Type
  addi: { format: 'RRI', opcode: 0x08 },
  addiu: { format: 'RRI', opcode: 0x09 },
  andi: { format: 'RRI', opcode: 0x0c },
  ori: { format: 'RRI', opcode: 0x0d },
  xori: { format: 'RRI', opcode: 0x0e },
  lui: { format: 'RI', opcode: 0x0f },
  lw: { format: 'RC', opcode: 0x23 },
  sw: { format: 'RC', opcode: 0x2b },
  lb: { format: 'RC', opcode: 0x20 },
  lbu: { format: 'RC', opcode: 0x24 },
  lh: { format: 'RC', opcode: 0x21 },
  lhu: { format: 'RC', opcode: 0x25 },
  sb: { format: 'RC', opcode: 0x28 },
  sh: { format: 'RC', opcode: 0x29 },
  beq: { format: 'RRI', opcode: 0x04 },
  bne: { format: 'RRI', opcode: 0x05 },
  slti: { format: 'RRI', opcode: 0x0a },
  sltiu: { format: 'RRI', opcode: 0x0b },
  // J-Type
  j: { format: 'I', opcode: 0x02 },
  jal: { format: 'I', opcode: 0x03 },
}

const REG_MAP: RegisterMap = {
  zero: 0,
  $zero: 0,
  $at: 1,
  $v0: 2,
  $v1: 3,
  $a0: 4,
  $a1: 5,
  $a2: 6,
  $a3: 7,
  $t0: 8,
  $t1: 9,
  $t2: 10,
  $t3: 11,
  $t4: 12,
  $t5: 13,
  $t6: 14,
  $t7: 15,
  $s0: 16,
  $s1: 17,
  $s2: 18,
  $s3: 19,
  $s4: 20,
  $s5: 21,
  $s6: 22,
  $s7: 23,
  $t8: 24,
  $t9: 25,
  $k0: 26,
  $k1: 27,
  $gp: 28,
  $sp: 29,
  $fp: 30,
  $ra: 31,
}

const NUM_REG_MAP: Record<string, string>[] = [
  {
    $0: 'zero',
  },
  {
    $0: '$zero',
  },
  {
    $1: '$at',
  },
  {
    $2: '$v0',
  },
  {
    $3: '$v1',
  },
  {
    $4: '$a0',
  },
  {
    $5: '$a1',
  },
  {
    $6: '$a2',
  },
  {
    $7: '$a3',
  },
  {
    $8: '$t0',
  },
  {
    $9: '$t1',
  },
  {
    $10: '$t2',
  },
  {
    $11: '$t3',
  },
  {
    $12: '$t4',
  },
  {
    $13: '$t5',
  },
  {
    $14: '$t6',
  },
  {
    $15: '$t7',
  },
  {
    $16: '$s0',
  },
  {
    $17: '$s1',
  },
  {
    $18: '$s2',
  },
  {
    $19: '$s3',
  },
  {
    $20: '$s4',
  },
  {
    $21: '$s5',
  },
  {
    $22: '$s6',
  },
  {
    $23: '$s7',
  },
  {
    $24: '$t8',
  },
  {
    $25: '$t9',
  },
  {
    $26: '$k0',
  },
  {
    $27: '$k1',
  },
  {
    $28: '$gp',
  },
  {
    $29: '$sp',
  },
  {
    $30: '$fp',
  },
  {
    $31: '$ra',
  },
]
export { NUM_REG_MAP, REG_MAP, TOKEN_TYPE, TOKEN_NAME, MIPS_INSTRUCTIONS, regexps }
