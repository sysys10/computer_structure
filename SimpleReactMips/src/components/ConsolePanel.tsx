import { forwardRef } from 'react'
import { Box, Button, Paper, Typography } from '@mui/material'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'

interface ConsoleMessage {
  text: string
  type: 'info' | 'error' | 'warning' | ''
  timestamp: string
}

interface ConsolePanelProps {
  messages: ConsoleMessage[]
  onClear: () => void
}

const ConsolePanel = forwardRef<HTMLDivElement, ConsolePanelProps>(({ messages, onClear }, ref) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper
        elevation={0}
        sx={{
          p: 1,
          flex: 1,
          overflowY: 'auto',
          bgcolor: 'rgba(0, 0, 0, 0.05)',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
        }}
      >
        {messages.map((message, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            {message.type === 'error' && <ErrorIcon color="error" fontSize="small" sx={{ mr: 1 }} />}
            {message.type === 'warning' && <WarningIcon color="warning" fontSize="small" sx={{ mr: 1 }} />}
            {message.type === 'info' && <InfoIcon color="info" fontSize="small" sx={{ mr: 1 }} />}
            <Typography
              variant="body2"
              component="span"
              sx={{
                fontFamily: 'monospace',
                color:
                  message.type === 'error'
                    ? 'error.main'
                    : message.type === 'warning'
                    ? 'warning.main'
                    : message.type === 'info'
                    ? 'info.main'
                    : 'text.primary',
              }}
            >
              [{message.timestamp}] {message.text}
            </Typography>
          </Box>
        ))}
        <div ref={ref} />
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Button variant="outlined" size="small" onClick={onClear}>
          Clear Console
        </Button>
      </Box>
    </Box>
  )
})

export default ConsolePanel
