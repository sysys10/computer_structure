import { useState } from 'react'
import { Box, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { BoxTitle } from './common/BoxTitle'
import useMemoryStore from '@/stores/useMemoryStore'
import useErrorStore from '@/stores/useErrorStore'

export function MemoryViewHeader() {
  const { setViewAddress, parseAddress } = useMemoryStore()
  const { setError } = useErrorStore()
  const [addressInput, setAddressInput] = useState<string>('0x10000000')

  const handleLookup = () => {
    const address = parseAddress(addressInput)
    if (address !== null) {
      setViewAddress(address)
    } else {
      setError(`Invalid address format: ${addressInput}`)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLookup()
    }
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <TextField
        size="small"
        value={addressInput}
        onChange={(e) => setAddressInput(e.target.value)}
        onKeyPress={handleKeyPress}
        sx={{ width: '150px' }}
        placeholder="0x10000000"
      />
      <Button variant="contained" size="small" color="inherit" onClick={handleLookup}>
        Lookup
      </Button>
      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Supports address in hex format</Box>
    </Box>
  )
}

export function MemoryViewBody() {
  const { viewAddress, getMemoryView } = useMemoryStore()
  const rows = 16
  const bytesPerRow = 16

  // Get memory data from the store
  const memoryData = getMemoryView(rows, bytesPerRow)

  const renderMemoryTable = () => {
    const tableRows = []

    for (let row = 0; row < rows; row++) {
      const rowAddress = viewAddress + row * bytesPerRow
      const cells = []

      // Address cell
      cells.push(
        <TableCell
          key={`addr-${row}`}
          sx={{
            fontWeight: 'bold',
            fontFamily: 'monospace',
            width: '120px',
            padding: '2px 8px',
          }}
        >
          {`0x${rowAddress.toString(16).padStart(8, '0')}`}
        </TableCell>,
      )

      // Data cells
      for (let col = 0; col < bytesPerRow; col++) {
        const byteOffset = row * bytesPerRow + col
        let byteValue = '00'

        // If we have memory data, use it
        if (byteOffset < memoryData.length) {
          byteValue = memoryData[byteOffset].toString(16).padStart(2, '0')
        }

        cells.push(
          <TableCell
            key={`byte-${row}-${col}`}
            sx={{
              fontFamily: 'monospace',
              width: '20px',
              padding: '2px 4px',
              textAlign: 'center',
            }}
          >
            {byteValue}
          </TableCell>,
        )
      }

      tableRows.push(<TableRow key={`row-${row}`}>{cells}</TableRow>)
    }

    return tableRows
  }

  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
      <TableContainer>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '120px', padding: '2px 8px' }}>Address</TableCell>
              {Array.from({ length: 16 }, (_, i) => (
                <TableCell
                  key={`header-${i}`}
                  sx={{
                    fontWeight: 'bold',
                    width: '20px',
                    padding: '2px 4px',
                    textAlign: 'center',
                  }}
                >
                  {i.toString(16).toUpperCase()}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>{renderMemoryTable()}</TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export function MemoryView() {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <BoxTitle title="Memory" />
      <MemoryViewHeader />
      <MemoryViewBody />
    </Box>
  )
}
