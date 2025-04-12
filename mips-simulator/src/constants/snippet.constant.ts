const Opcodes = [
  { Opcode: 'ADD rf,rs,rt', Name: 'Add', Action: 'rf = rs + rt' },
  { Opcode: 'ADDI rt,rs,imm', Name: 'Add Immediate', Action: 'rt = rs + imm' },
  { Opcode: 'SUB rf,rs,rt', Name: 'Subtract', Action: 'rf = rs - rt' },
  { Opcode: 'SUBI rt,rs,immediate', Name: 'Subtract Immediate', Action: 'rt = rs - immediate' },
  { Opcode: 'AND rf,rs,rt', Name: 'And', Action: 'rf = rs & rt' },
  { Opcode: 'ANDI rt,rs,immediate', Name: 'And Immediate', Action: 'rt = rs & immediate' },
  { Opcode: 'OR rf,rs,rt', Name: 'Or', Action: 'rf = rs | rt' },
]
