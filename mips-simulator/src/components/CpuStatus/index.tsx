import { Box, Grid } from '@mui/material'
import { CpuStatusHeader } from './CpuStatusHeader'
import { CpuStatusBody } from './CpuStatusBody'

export function CpuStatus() {
  return (
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
        <CpuStatusHeader />
        <CpuStatusBody />
      </Box>
    </Grid>
  )
}
