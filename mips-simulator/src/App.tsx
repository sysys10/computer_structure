import { Container, Box, Typography, Grid, Snackbar, Alert } from '@mui/material'
import { Assembly, CpuStatus } from '@components'
import useErrorStore from '@/stores/useErrorStore'
import { MemoryView } from './components/MemoryView'
import { OutputLog } from './components/OutputLog'

function App() {
  const { error, setError } = useErrorStore()

  const handleCloseError = () => {
    setError('')
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Typography variant="h4" gutterBottom>
          MIPS Simulator
        </Typography>
        <Grid container spacing={2}>
          <Assembly />
          <CpuStatus />
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <Box
              sx={{
                border: 1,
                p: 2,
                height: '450px',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                position: 'relative',
              }}
            >
              <MemoryView />
            </Box>
          </Grid>
          <Grid size={12} sx={{ mt: 2 }}>
            <Box
              sx={{
                border: 1,
                p: 2,
                height: '150px',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                position: 'relative',
              }}
            >
              <OutputLog />
            </Box>
          </Grid>
        </Grid>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={handleCloseError}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </Container>
    </>
  )
}

export default App
