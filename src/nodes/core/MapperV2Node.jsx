import { useState } from 'react'
import { Box, Button, IconButton, MenuItem, TextField } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import JsonNode from './JsonNode.jsx'

const FIELD_TYPES = [
  'string',
  'number',
  'boolean',
  'array',
  'object',
  'null',
  'analog_input',
  'digital_input',
]

function MapperV2Node({ data, selected }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('string')
  const [unit, setUnit] = useState('')

  const add = () => {
    const key = name.trim()
    if (!key) return
    data.onAddField?.(key, type, unit.trim())
    setName('')
    setUnit('')
    setOpen(false)
  }

  const footer = (
    <Box
      className="nodrag"
      sx={{ borderTop: '1px solid', borderColor: 'divider', px: 1.5, py: 0.75 }}
    >
      {open ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <TextField
            size="small"
            variant="outlined"
            fullWidth
            autoFocus
            label="Field name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
              if (e.key === 'Escape') setOpen(false)
            }}
            slotProps={{
              inputLabel: { sx: { fontSize: 11 } },
              htmlInput: {
                style: { fontFamily: 'monospace', fontSize: 12, padding: '5px 8px' },
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
              sx={{ flex: 1, '& .MuiSelect-select': { fontFamily: 'monospace', fontSize: 12, py: 0.5 } }}
            >
              {FIELD_TYPES.map((t) => (
                <MenuItem key={t} value={t} sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              variant="outlined"
              label="Unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') add()
                if (e.key === 'Escape') setOpen(false)
              }}
              slotProps={{
                inputLabel: { sx: { fontSize: 11 } },
                htmlInput: {
                  style: { fontFamily: 'monospace', fontSize: 12, padding: '5px 8px' },
                },
              }}
              sx={{ flex: 1 }}
            />
            <IconButton size="small" onClick={add} disabled={!name.trim()} sx={{ p: 0.25 }}>
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ p: 0.25 }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </Box>
      ) : (
        <Button
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 14 }} />}
          onClick={() => setOpen(true)}
          sx={{ px: 0.5, py: 0, minWidth: 0, fontSize: 11, textTransform: 'none' }}
        >
          Add field
        </Button>
      )}
    </Box>
  )

  return <JsonNode data={data} selected={selected} footer={footer} />
}

export default MapperV2Node
