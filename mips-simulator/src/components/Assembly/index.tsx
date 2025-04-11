import { Box, Grid } from '@mui/material'
import { AssemblyHeader } from './AssemblyHeader'
import { AssemblyBody } from './AssemblyBody'
import { BoxTitle } from '../common/BoxTitle'

export function Assembly() {
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
        <BoxTitle title="Assembly Source" />
        <AssemblyHeader />
        <AssemblyBody />
      </Box>
    </Grid>
  )
}
