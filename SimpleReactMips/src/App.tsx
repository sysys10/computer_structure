import { useState, useEffect, useRef } from 'react'
import { Box, Container, Paper, Button, TextField, Typography, Tab, Tabs } from '@mui/material'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import InfoIcon from '@mui/icons-material/Info'
import ConsolePanel from './components/ConsolePanel'
import { formatHex } from './utils/formatters'

// Mock implementations of the MIPS simulator core
// In a real application, you would reimplement or port the original functions
class Memory {
  chunks: any[] = []
  latencyCtr: number = 0
  latency: number = 1
  busy: boolean = false

  getWord(addr: number): number {
    // Simplified implementation
    const chunkIdx = Math.floor(addr / 65536)
    const offset = addr % 65536
    return this.chunks[chunkIdx]?.[offset] || 0
  }

  setWord(addr: number, val: number): void {
    const chunkIdx = Math.floor(addr / 65536)
    const offset = addr % 65536
    if (!this.chunks[chunkIdx]) {
      this.chunks[chunkIdx] = []
    }
    this.chunks[chunkIdx][offset] = val
  }

  step(): void {
    if (this.busy) {
      this.latencyCtr++
      if (this.latencyCtr >= this.latency) {
        this.latencyCtr = 0
        this.busy = false
      }
    }
  }

  importAsm(asmResult: any): void {
    // Load data segment
    for (let i = 0; i < asmResult.dataMem.length; i++) {
      this.setWord(asmResult.dataStart + i * 4, asmResult.dataMem[i])
    }

    // Load text segment
    for (let i = 0; i < asmResult.textMem.length; i++) {
      this.setWord(asmResult.textStart + i * 4, asmResult.textMem[i])
    }
  }
}

class CPU {
  mem: Memory
  pc: number = 0x00040000
  cycle: number = 0
  stalls: number = 0
  registerFile: number[] = Array(32).fill(0)
  halted: boolean = false

  // Pipeline registers
  if_id: any = { pc: 0, inst: 0 }
  id_ex: any = { pc: 0, inst: 0, aluOp: 0, regDst: -1 }
  ex_ma: any = { pc: 0, inst: 0, aluOut: 0, regDst: -1 }
  ma_wb: any = { pc: 0, inst: 0, regVal: 0, regDst: -1 }
  retiredPC: number = 0
  retiredInst: number = 0

  // Debug info for pipeline view
  debugInfo: any = {
    stallFlag: 0,
    memOp: 0,
    aluOp: 0,
    regDst: -1,
    regOp: false,
  }

  constructor(memory: Memory) {
    this.mem = memory
    this.reset()
  }

  reset(): void {
    this.pc = 0x00040000
    this.cycle = 0
    this.stalls = 0
    this.registerFile = Array(32).fill(0)
    this.registerFile[28] = 0x10008000 // $gp
    this.registerFile[29] = 0x7ffffffc // $sp
    this.halted = false

    // Reset pipeline registers
    this.if_id = { pc: 0, inst: 0 }
    this.id_ex = { pc: 0, inst: 0, aluOp: 0, regDst: -1 }
    this.ex_ma = { pc: 0, inst: 0, aluOut: 0, regDst: -1 }
    this.ma_wb = { pc: 0, inst: 0, regVal: 0, regDst: -1 }
    this.retiredPC = 0
    this.retiredInst = 0
  }

  step(): number {
    // Simplified implementation
    this.mem.step()
    this.cycle++

    // Move instructions through the pipeline (simplified)
    this.ma_wb = { ...this.ex_ma }
    this.ex_ma = { ...this.id_ex }
    this.id_ex = { ...this.if_id }
    this.if_id = { pc: this.pc, inst: this.mem.getWord(this.pc) }

    // Update PC
    this.pc += 4

    // Basic register write-back simulation
    if (this.ma_wb.regDst > 0) {
      this.registerFile[this.ma_wb.regDst] = this.ma_wb.regVal
    }

    // Always ensure r0 is 0
    this.registerFile[0] = 0

    return 0 // No exceptions
  }
}

const Assembler = {
  assemble: (src: string) => {
    // Simplified assembler that just returns a mock result
    // In a real application, you would implement the actual assembler logic
    return {
      dataStart: 0x10000000,
      textStart: 0x00040000,
      dataSize: 64,
      textSize: src.split('\n').filter((line) => line.trim()).length * 4,
      dataMem: Array(16).fill(0),
      textMem: Array(src.split('\n').filter((line) => line.trim()).length).fill(0),
      sourceMap: [],
      symbolTable: {},
    }
  },

  disassemble: (inst: number): string => {
    return `0x${inst.toString(16).padStart(8, '0')}`
  },
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      style={{ height: 'calc(100% - 48px)' }}
      {...other}
    >
      {value === index && <Box sx={{ p: 2, height: '100%' }}>{children}</Box>}
    </div>
  )
}

interface ConsoleMessage {
  text: string
  type: 'info' | 'error' | 'warning' | ''
  timestamp: string
}

interface MemoryRow {
  address: number
  words: number[]
}

function App() {
  const [source, setSource] = useState<string>(
    '# Enter your MIPS code here\n.text\nmain:\n    li $t0, 10\n    li $t1, 20\n    add $t2, $t0, $t1\n    syscall',
  )
  const [tabValue, setTabValue] = useState<number>(0)
  const [loaded, setLoaded] = useState<boolean>(false)
  const [running, setRunning] = useState<boolean>(false)
  const [pipelineView, setPipelineView] = useState<boolean>(false)
  const [registers, setRegisters] = useState<number[]>(Array(32).fill(0))
  const [pc, setPc] = useState<number>(0x00040000)
  const [cycle, setCycle] = useState<number>(0)
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([])
  const [memoryAddress, setMemoryAddress] = useState<string>('0x10000000')
  const [memoryContent, setMemoryContent] = useState<MemoryRow[]>([])

  // Refs
  const memory = useRef<Memory>(new Memory())
  const cpu = useRef<CPU>(new CPU(memory.current))
  const runInterval = useRef<number | null>(null)
  const consoleEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of console when messages change
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [consoleMessages])

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (runInterval.current !== null) {
        window.clearInterval(runInterval.current)
      }
    }
  }, [])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const addConsoleMessage = (text: string, type: 'info' | 'error' | 'warning' | '' = '') => {
    const now = new Date()
    const timestamp = now.toLocaleTimeString()
    setConsoleMessages((prev) => [...prev, { text, type, timestamp }])
  }

  const handleClearConsole = () => {
    setConsoleMessages([])
  }

  const handleAssemble = () => {
    try {
      if (running) {
        handleStop()
      }
      const result = Assembler.assemble(source)

      // Load into memory
      memory.current.importAsm(result)

      // Reset CPU
      cpu.current.reset()

      // Update state
      setPc(cpu.current.pc)
      setCycle(cpu.current.cycle)
      setRegisters([...cpu.current.registerFile])
      setLoaded(true)

      // Update memory view
      handleMemoryLookup()

      addConsoleMessage(
        `Assembly successful - Code size: ${result.textSize} bytes, Data size: ${result.dataSize} bytes`,
        'info',
      )
    } catch (error) {
      addConsoleMessage(`Assembly error: ${(error as Error).message}`, 'error')
    }
  }

  const handleStep = () => {
    if (!loaded) {
      addConsoleMessage('No program loaded. Please assemble first.', 'warning')
      return
    }

    try {
      const exception = cpu.current.step()

      // Update UI
      setPc(cpu.current.pc)
      setCycle(cpu.current.cycle)
      setRegisters([...cpu.current.registerFile])

      if (exception !== 0) {
        addConsoleMessage(`CPU Exception: ${exception}`, 'error')
      }

      // Update memory view if visible
      if (tabValue === 2) {
        handleMemoryLookup()
      }
    } catch (error) {
      addConsoleMessage(`Execution error: ${(error as Error).message}`, 'error')
      handleStop()
    }
  }

  const handleRun = () => {
    if (!loaded) {
      addConsoleMessage('No program loaded. Please assemble first.', 'warning')
      return
    }

    if (running) {
      handleStop()
    } else {
      setRunning(true)
      addConsoleMessage('Program running...', 'info')

      runInterval.current = window.setInterval(() => {
        try {
          // Execute multiple steps for performance
          for (let i = 0; i < 1000; i++) {
            const exception = cpu.current.step()
            if (exception !== 0 || cpu.current.halted) {
              if (exception !== 0) {
                addConsoleMessage(`CPU Exception: ${exception}`, 'error')
              }
              handleStop()
              break
            }
          }

          // Update UI occasionally
          setPc(cpu.current.pc)
          setCycle(cpu.current.cycle)
          setRegisters([...cpu.current.registerFile])
        } catch (error) {
          addConsoleMessage(`Execution error: ${(error as Error).message}`, 'error')
          handleStop()
        }
      }, 50)
    }
  }

  const handleStop = () => {
    if (runInterval.current !== null) {
      window.clearInterval(runInterval.current)
      runInterval.current = null
    }
    setRunning(false)
    addConsoleMessage('Program execution stopped', 'info')

    // Update UI with final state
    setPc(cpu.current.pc)
    setCycle(cpu.current.cycle)
    setRegisters([...cpu.current.registerFile])

    // Update memory view if visible
    if (tabValue === 2) {
      handleMemoryLookup()
    }
  }

  const handleReset = () => {
    if (running) {
      handleStop()
    }

    cpu.current.reset()

    // Update UI
    setPc(cpu.current.pc)
    setCycle(cpu.current.cycle)
    setRegisters([...cpu.current.registerFile])

    // Update memory view
    handleMemoryLookup()

    addConsoleMessage('CPU reset complete', 'info')
  }

  const handleMemoryLookup = () => {
    try {
      // Parse address
      let address: number
      if (memoryAddress.toLowerCase() === '$sp') {
        address = cpu.current.registerFile[29]
      } else if (memoryAddress.toLowerCase() === '$pc') {
        address = cpu.current.pc
      } else {
        // Assume hex
        address = parseInt(memoryAddress.replace(/^0x/i, ''), 16)
      }

      if (isNaN(address)) {
        addConsoleMessage('Invalid memory address format', 'error')
        return
      }

      // Align to word boundary
      address = address & ~0x3

      // Read memory content
      const content: MemoryRow[] = []
      for (let i = 0; i < 10; i++) {
        const rowAddr = address + i * 16
        const row: MemoryRow = {
          address: rowAddr,
          words: [],
        }

        for (let j = 0; j < 4; j++) {
          const wordAddr = rowAddr + j * 4
          const value = memory.current.getWord(wordAddr)
          row.words.push(value)
        }

        content.push(row)
      }

      setMemoryContent(content)
    } catch (error) {
      addConsoleMessage(`Memory lookup error: ${(error as Error).message}`, 'error')
    }
  }

  // Register names mapping
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

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          MIPS Simulator
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={handleAssemble}>
            Assemble
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<SkipNextIcon />}
            onClick={handleStep}
            disabled={!loaded || running}
          >
            Step
          </Button>

          <Button
            variant="contained"
            color={running ? 'error' : 'success'}
            startIcon={running ? <StopIcon /> : <PlayArrowIcon />}
            onClick={handleRun}
            disabled={!loaded}
          >
            {running ? 'Stop' : 'Run'}
          </Button>

          <Button variant="outlined" onClick={handleReset} disabled={!loaded}>
            Reset
          </Button>

          <Button variant="outlined" onClick={() => setPipelineView(!pipelineView)}>
            {pipelineView ? 'Register View' : 'Pipeline View'}
          </Button>

          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              PC:{' '}
              <Box component="span" sx={{ fontFamily: 'monospace' }}>
                {formatHex(pc)}
              </Box>
            </Typography>
            <Typography variant="body2">
              Cycle:{' '}
              <Box component="span" sx={{ fontFamily: 'monospace' }}>
                {cycle}
              </Box>
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Left panel */}
        <Box sx={{ flex: 2 }}>
          <Paper sx={{ minHeight: 600 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="simulator tabs">
                <Tab label="Assembly" id="tab-0" aria-controls="tabpanel-0" />
                <Tab label="Console" id="tab-1" aria-controls="tabpanel-1" />
                <Tab label="Memory" id="tab-2" aria-controls="tabpanel-2" />
              </Tabs>
            </Box>

            {/* Assembly Editor Tab */}
            <TabPanel value={tabValue} index={0}>
              <TextField
                multiline
                fullWidth
                value={source}
                onChange={(e) => setSource(e.target.value)}
                sx={{
                  '& .MuiInputBase-root': {
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                  },
                  height: '100%',
                }}
                inputProps={{
                  style: { height: '100%' },
                }}
                disabled={loaded}
              />
            </TabPanel>

            {/* Console Tab */}
            <TabPanel value={tabValue} index={1}>
              <ConsolePanel messages={consoleMessages} onClear={handleClearConsole} ref={consoleEndRef} />
            </TabPanel>

            {/* Memory Tab */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                <TextField
                  label="Memory Address"
                  value={memoryAddress}
                  onChange={(e) => setMemoryAddress(e.target.value)}
                  size="small"
                  sx={{ width: 200 }}
                />
                <Button variant="contained" startIcon={<SearchIcon />} onClick={handleMemoryLookup}>
                  Lookup
                </Button>
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                  <InfoIcon fontSize="small" color="info" sx={{ mr: 0.5 }} />
                  <Typography variant="caption">Enter a hex address (0x10000000), $sp, or $pc</Typography>
                </Box>
              </Box>

              <TableContainer component={Paper} sx={{ height: 'calc(100% - 60px)' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Address</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>+0</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>+4</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>+8</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>+C</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {memoryContent.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{formatHex(row.address)}</TableCell>
                        {row.words.map((word, wordIndex) => (
                          <TableCell key={wordIndex} sx={{ fontFamily: 'monospace' }}>
                            {formatHex(word)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </Paper>
        </Box>

        {/* Right panel - Registers or Pipeline View */}
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 2, minHeight: 600 }}>
            <Typography variant="h6" gutterBottom>
              {pipelineView ? 'Pipeline Status' : 'Registers'}
            </Typography>

            {pipelineView ? (
              // Pipeline view
              <Box>
                {['IF', 'ID', 'EX', 'MA', 'WB'].map((stage, index) => (
                  <Paper
                    key={stage}
                    elevation={1}
                    sx={{
                      p: 1,
                      mb: 2,
                      bgcolor: 'rgba(0, 0, 0, 0.05)',
                      borderLeft: 4,
                      borderColor:
                        index === 0
                          ? 'info.main'
                          : index === 1
                          ? 'success.main'
                          : index === 2
                          ? 'error.main'
                          : index === 3
                          ? 'warning.main'
                          : 'secondary.main',
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      color={
                        index === 0
                          ? 'info.main'
                          : index === 1
                          ? 'success.main'
                          : index === 2
                          ? 'error.main'
                          : index === 3
                          ? 'warning.main'
                          : 'secondary.main'
                      }
                    >
                      {stage}
                    </Typography>

                    <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace' }}>
                      Instruction:{' '}
                      {stage === 'IF'
                        ? Assembler.disassemble(memory.current.getWord(pc))
                        : stage === 'ID'
                        ? Assembler.disassemble(cpu.current.id_ex.inst)
                        : stage === 'EX'
                        ? Assembler.disassemble(cpu.current.ex_ma.inst)
                        : stage === 'MA'
                        ? Assembler.disassemble(cpu.current.ma_wb.inst)
                        : Assembler.disassemble(cpu.current.retiredInst)}
                    </Typography>

                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {stage === 'IF'
                        ? `PC: ${formatHex(pc)}`
                        : stage === 'ID'
                        ? `Stall: ${!!(cpu.current.debugInfo.stallFlag & 4)}`
                        : stage === 'EX'
                        ? `ALU Op: ${cpu.current.debugInfo.aluOp}`
                        : stage === 'MA'
                        ? `Mem Op: ${cpu.current.debugInfo.memOp}`
                        : `Reg Write: ${cpu.current.debugInfo.regOp ? 'Yes' : 'No'}`}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            ) : (
              // Register view
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {registers.map((value, index) => (
                      <TableRow key={index}>
                        <TableCell>${index}</TableCell>
                        <TableCell>${regNames[index]}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{formatHex(value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      </Box>
    </Container>
  )
}

export default App
