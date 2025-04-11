import { assemble } from '@/models/assembler'
import { useSourceStore } from '@/stores'
import useErrorStore from '@/stores/useErrorStore'
import { AssemblyResult } from '@/types'
import { Button } from '@mui/material'

function Memory(result: AssemblyResult) {
  console.log(result)
}

export function AssemblyHeader() {
  const source = useSourceStore((state) => state.source)
  const setError = useErrorStore((state) => state.setError)

  const handleClickAssemble = async () => {
    try {
      const result = assemble(source)
      Memory(result)
    } catch (error: any) {
      setError(error.message)
    }
  }
  return (
    <Button
      variant="contained"
      onClick={handleClickAssemble}
      color="inherit"
      size="small"
      sx={{ width: 'fit-content' }}
    >
      Assemble & Load
    </Button>
  )
}
