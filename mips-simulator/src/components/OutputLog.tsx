import { Box, Button, Typography } from '@mui/material'
import { BoxTitle } from './common/BoxTitle'
import useLogStore, { LogEntry } from '@/stores/useLogStore'

export function OutputLog() {
  const { logs, clearLogs } = useLogStore()

  const handleClear = () => {
    clearLogs()
  }

  // Function to format timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString()
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <BoxTitle title="Output" />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <Button variant="contained" size="small" color="inherit" onClick={handleClear}>
          Clear
        </Button>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          padding: 1,
          border: '1px solid #ddd',
          borderRadius: 1,
          backgroundColor: '#f8f8f8',
          fontSize: '0.875rem',
          fontFamily: 'monospace',
        }}
      >
        {logs.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            No output yet...
          </Typography>
        ) : (
          logs.map((log) => (
            <Box
              key={log.id}
              sx={{
                mb: 0.5,
                color: log.type === 'error' ? 'error.main' : log.type === 'warn' ? 'warning.main' : 'text.primary',
              }}
            >
              <Typography component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
                [{formatTimestamp(log.timestamp)}]
              </Typography>
              <Typography component="span">{log.message}</Typography>
            </Box>
          ))
        )}
      </Box>
    </Box>
  )
}
