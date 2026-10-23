import { Box, Button, IconButton, TextField } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import { fmt, monoInputStyle } from '../utils.jsx'

function ArrayFieldNode({ data }) {
  const rawItems = Array.isArray(data.params?.value) ? data.params.value : []
  const wiredItems =
    data.wired && Array.isArray(data.wiredValue) ? data.wiredValue : []
  const manual = rawItems
  const setManual = (next) => data.onParamChange?.('value', next)
  return (
    <>
      {wiredItems.map((item, i) => (
        <Box
          key={`w-${i}`}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}
        >
          <TextField
            size="small"
            variant="outlined"
            fullWidth
            placeholder="value"
            disabled
            value={fmt(item)}
            slotProps={{ htmlInput: { style: monoInputStyle(true) } }}
          />
        </Box>
      ))}
      {manual.map((item, i) => (
        <Box
          key={`m-${i}`}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}
        >
          <TextField
            size="small"
            variant="outlined"
            fullWidth
            placeholder="value"
            value={fmt(item)}
            onChange={(e) =>
              setManual(manual.map((x, j) => (j === i ? e.target.value : x)))
            }
            slotProps={{ htmlInput: { style: monoInputStyle(false) } }}
          />
          <IconButton
            size="small"
            onClick={() => setManual(manual.filter((_, j) => j !== i))}
            sx={{ p: 0.25 }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      ))}
      <Button
        size="small"
        startIcon={<AddIcon sx={{ fontSize: 14 }} />}
        onClick={() => setManual([...manual, ''])}
        sx={{ px: 0.5, py: 0, minWidth: 0, fontSize: 11, textTransform: 'none' }}
      >
        Add item
      </Button>
    </>
  )
}

export default ArrayFieldNode
