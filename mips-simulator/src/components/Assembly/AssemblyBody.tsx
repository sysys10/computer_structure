import { TextField } from '@mui/material'
import { useSourceStore } from '@stores'

export function AssemblyBody() {
  const { source, setSource, loaded } = useSourceStore()
  return (
    <TextField
      multiline
      fullWidth
      value={source}
      onChange={(e) => setSource(e.target.value)}
      sx={{
        '& .MuiInputBase-root': {
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          flex: 1,
          display: 'flex',
          alignItems: 'start',
        },
        flex: 1,
      }}
      disabled={loaded}
    />
  )
}
