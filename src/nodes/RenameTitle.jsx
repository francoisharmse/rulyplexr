import { useState } from 'react'
import { TextField, Typography } from '@mui/material'

export default function RenameTitle({ value, onRename, variant = 'caption', sx }) {
  const [edit, setEdit] = useState(null)
  const commit = () => {
    const v = (edit ?? '').trim()
    if (v && v !== value) onRename?.(v)
    setEdit(null)
  }
  if (edit === null)
    return (
      <Typography
        variant={variant}
        noWrap
        title={onRename ? 'Double-click to rename' : undefined}
        onDoubleClick={
          onRename
            ? (e) => {
                e.stopPropagation()
                setEdit(value)
              }
            : undefined
        }
        sx={{ cursor: onRename ? 'text' : 'inherit', ...sx }}
      >
        {value}
      </Typography>
    )
  return (
    <TextField
      autoFocus
      size="small"
      variant="standard"
      className="nodrag"
      value={edit}
      onChange={(e) => setEdit(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setEdit(null)
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      slotProps={{
        input: {
          disableUnderline: true,
          sx: { fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' },
        },
        htmlInput: { style: { padding: 0, fontFamily: 'inherit' } },
      }}
      sx={{ minWidth: 80, flexShrink: 1, ...sx }}
    />
  )
}
