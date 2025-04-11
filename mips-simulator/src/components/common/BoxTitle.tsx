import { Typography } from '@mui/material'

interface BoxTitleProps {
  title: string
}
export function BoxTitle({ title }: BoxTitleProps) {
  return (
    <Typography
      variant="subtitle1"
      sx={{
        position: 'absolute',
        top: -18,
        left: 16,
        paddingX: 1,
        fontSize: '1.2rem',
        backgroundColor: 'background.paper',
      }}
    >
      {title}
    </Typography>
  )
}
