import { assemble } from '@/models/assembler'
import { useSourceStore } from '@/stores'
import useErrorStore from '@/stores/useErrorStore'
import useCpuStore from '@/stores/useCpuStore'
import useLogStore from '@/stores/useLogStore'
import { Button } from '@mui/material'

export function AssemblyHeader() {
  const { source, loaded, setLoaded } = useSourceStore()
  const { setError } = useErrorStore()
  const { memory, reset } = useCpuStore()
  const { addLog } = useLogStore()

  const handleClickAssemble = async () => {
    try {
      if (loaded) {
        reset()
        setLoaded(false)
        return
      }

      reset()

      const result = assemble(source)

      memory.importAsm(result)

      setLoaded(true)

      addLog(`Assembled successfully! Code size: ${result.textSize} bytes, Data size: ${result.dataSize} bytes`, 'info')
    } catch (error: any) {
      setError(error.message)
      addLog(`Assembly failed: ${error.message}`, 'error')
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
      {!loaded ? 'Assemble & Load' : 'Go Back to Edit'}
    </Button>
  )
}
