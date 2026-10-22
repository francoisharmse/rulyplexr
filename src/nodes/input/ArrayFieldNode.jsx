import { Box, Button, IconButton, TextField } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import { fmt, monoInputStyle } from '../utils.jsx'

function ArrayFieldNode({ data }) {
  const rawItems = Array.isArray(data.params?.value) ? data.params.value : []
  const items = data.wired
    ? Array.isArray(data.wiredValue)
      ? data.wiredValue
      : []
    : rawItems.length
      ? rawItems
      : ['']
  const setItems = (next) => data.onParamChange?.('value', next)
  return (
    <>
      {items.map((item, i) => (
        <Box
          key={i}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}
        >
          <TextField
            size="small"
            variant="outlined"
            fullWidth
            placeholder="value"
            disabled={!!data.wired}
            value={fmt(item)}
            onChange={(e) =>
              setItems(items.map((x, j) => (j === i ? e.target.value : x)))
            }
            slotProps={{ htmlInput: { style: monoInputStyle(!!data.wired) } }}
          />
          {!data.wired && (
            <IconButton
              size="small"
              disabled={items.length <= 1}
              onClick={() => setItems(items.filter((_, j) => j !== i))}
              sx={{ p: 0.25 }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
      ))}
      {!data.wired && (
        <Button
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 14 }} />}
          onClick={() => setItems([...items, ''])}
          sx={{ px: 0.5, py: 0, minWidth: 0, fontSize: 11, textTransform: 'none' }}
        >
          Add item
        </Button>
      )}
    </>
  )
}

export default ArrayFieldNode
