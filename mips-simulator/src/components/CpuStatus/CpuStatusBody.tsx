import { useState } from 'react'
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Typography,
} from '@mui/material'
import useCpuStore from '@/stores/useCpuStore'
import useLogStore from '@/stores/useLogStore'
import { ExceptionCode } from '@/models/cpu'

export function CpuStatusBody() {
  const { pc, cycle, instruction, registers, running, step, run, stop, reset } = useCpuStore()
  const { addLog } = useLogStore()
  const [displayFormat, setDisplayFormat] = useState<'hex' | 'dec'>('hex')

  const handleStep = () => {
    const exception = step()

    if (exception !== ExceptionCode.NONE) {
      // Log exception
      addLog(`Exception: ${getExceptionMessage(exception)}`, 'error')
    }
  }

  const handleRun = () => {
    if (running) {
      stop()
      addLog('Execution stopped', 'info')
    } else {
      run()
      addLog('Execution started', 'info')
    }
  }

  const handleReset = () => {
    reset()
    addLog('CPU reset', 'info')
  }

  // Helper function to get exception message
  const getExceptionMessage = (exception: ExceptionCode): string => {
    const messages: Record<number, string> = {
      [ExceptionCode.INVALID_INST]: 'Invalid instruction',
      [ExceptionCode.INT_OVERFLOW]: 'Integer overflow',
      [ExceptionCode.PC_ALIGN]: 'PC not word-aligned',
      [ExceptionCode.DATA_ALIGN]: 'Data address not aligned',
      [ExceptionCode.BRANCH_IN_DELAY_SLOT]: 'Branch in delay slot',
      [ExceptionCode.BREAK]: 'Break instruction',
      [ExceptionCode.PC_LIMIT]: 'PC exceeded limit',
      [ExceptionCode.SYSCALL]: 'System call',
    }

    return messages[exception] || `Unknown exception: ${exception}`
  }

  // Function to format register values based on selected format
  const formatValue = (value: number): string => {
    if (displayFormat === 'hex') {
      return `0x${value.toString(16).padStart(8, '0')}`
    } else {
      return value.toString()
    }
  }

  // Register names for display
  const regNames = [
    ['r0 zero', 'r16 s0'],
    ['r1 at', 'r17 s1'],
    ['r2 v0', 'r18 s2'],
    ['r3 v1', 'r19 s3'],
    ['r4 a0', 'r20 s4'],
    ['r5 a1', 'r21 s5'],
    ['r6 a2', 'r22 s6'],
    ['r7 a3', 'r23 s7'],
    ['r8 t0', 'r24 t8'],
    ['r9 t1', 'r25 t9'],
    ['r10 t2', 'r26 k0'],
    ['r11 t3', 'r27 k1'],
    ['r12 t4', 'r28 gp'],
    ['r13 t5', 'r29 sp'],
    ['r14 t6', 'r30 fp'],
    ['r15 t7', 'r31 ra'],
  ]

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        overflow: 'hidden',
      }}
    >
      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" color="inherit" size="small" onClick={handleStep}>
          Step
        </Button>
        <Button variant="contained" color="inherit" size="small" onClick={handleRun}>
          {running ? 'Stop' : 'Run'}
        </Button>
        <Button variant="contained" color="inherit" size="small" onClick={handleReset}>
          Reset
        </Button>
        <Typography
          variant="body2"
          sx={{
            ml: 'auto',
            display: 'flex',
            alignItems: 'center',
            color: running ? 'primary.main' : 'text.secondary',
            fontWeight: running ? 'bold' : 'normal',
          }}
        >
          {running ? 'Running...' : 'Idle'}
        </Typography>
      </Box>

      <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '80px' }}>PC</TableCell>
              <TableCell>{formatValue(pc)}</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '80px' }}>Cycle</TableCell>
              <TableCell>{cycle}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>
                Instruction
              </TableCell>
              <TableCell colSpan={2}>{formatValue(instruction)}</TableCell>
            </TableRow>

            {regNames.map((pair, idx) => (
              <TableRow key={`reg-row-${idx}`}>
                <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>{pair[0]}</TableCell>
                <TableCell>{formatValue(registers[idx])}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>{pair[1]}</TableCell>
                <TableCell>{formatValue(registers[idx + 16])}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <FormControl component="fieldset">
        <RadioGroup
          row
          name="displayFormat"
          value={displayFormat}
          onChange={(e) => setDisplayFormat(e.target.value as 'hex' | 'dec')}
        >
          <FormControlLabel
            value="hex"
            control={<Radio size="small" />}
            label={<Typography variant="body2">Hex</Typography>}
          />
          <FormControlLabel
            value="dec"
            control={<Radio size="small" />}
            label={<Typography variant="body2">Dec</Typography>}
          />
        </RadioGroup>
      </FormControl>
    </Box>
  )
}
