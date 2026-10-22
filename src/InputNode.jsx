import { Handle, NodeResizeControl, Position } from '@xyflow/react'
import { Box, Button, IconButton, Switch, TextField, Typography } from '@mui/material'
import AbcIcon from '@mui/icons-material/Abc'
import NumbersIcon from '@mui/icons-material/Numbers'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import DataArrayIcon from '@mui/icons-material/DataArray'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import INPUT_NODES from './inputNodes.js'

const TYPE_ICONS = {
  string: AbcIcon,
  number: NumbersIcon,
  boolean: ToggleOnIcon,
  array: DataArrayIcon,
}

const fmt = (v) =>
  v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)

const monoInputStyle = (wired) => ({
  fontFamily: 'monospace',
  fontSize: 12,
  padding: '5px 8px',
  ...(wired ? { WebkitTextFillColor: '#e6e2ff' } : {}),
})

function InputNode({ data, selected }) {
  const def = INPUT_NODES[data.kind] ?? INPUT_NODES.string_field
  const Icon = TYPE_ICONS[def.type] ?? AbcIcon
  const rawItems = Array.isArray(data.params?.value) ? data.params.value : []
  const items = data.wired
    ? Array.isArray(data.wiredValue)
      ? data.wiredValue
      : []
    : rawItems.length
      ? rawItems
      : ['']
  const setItems = (next) => data.onParamChange?.('value', next)
  const boolVal = data.wired ? !!data.wiredValue : !!data.params?.value

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 160,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: data.highlighted ? '#e6e2ff' : '#5eb4ff',
        boxShadow: data.highlighted ? '0 0 0 1.5px #e6e2ff' : 6,
        borderRadius: '4px',
      }}
    >
      {selected && (
        <NodeResizeControl
          position="right"
          variant="line"
          resizeDirection="horizontal"
          minWidth={160}
          color="#5eb4ff"
          style={{ width: 8, transform: 'translate(-100%, 0)' }}
        />
      )}
      <Handle type="target" position={Position.Left} id="in" className="rf-single" />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.75,
          bgcolor: 'rgba(94,180,255,0.18)',
          color: '#5eb4ff',
          borderRadius: '3px 3px 0 0',
        }}
      >
        <Icon sx={{ fontSize: 16 }} />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {data.label ?? def.label}
        </Typography>
      </Box>
      <Box className="nodrag" sx={{ px: 1.25, py: 1 }}>
        {def.type === 'boolean' ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch
              size="small"
              disabled={!!data.wired}
              checked={boolVal}
              onChange={(e) => data.onParamChange?.('value', e.target.checked)}
            />
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: data.wired ? '#e6e2ff' : 'text.secondary',
              }}
            >
              {String(boolVal)}
            </Typography>
          </Box>
        ) : def.type === 'array' ? (
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
        ) : (
          <TextField
            size="small"
            variant="outlined"
            fullWidth
            type={def.type === 'number' ? 'number' : 'text'}
            placeholder={def.type === 'number' ? '0' : 'value'}
            disabled={!!data.wired}
            value={data.wired ? fmt(data.wiredValue) : data.params?.value ?? ''}
            onChange={(e) => data.onParamChange?.('value', e.target.value)}
            slotProps={{ htmlInput: { style: monoInputStyle(!!data.wired) } }}
          />
        )}
      </Box>
      <Handle type="source" position={Position.Right} id="out" className="rf-multi" />
    </Box>
  )
}

export default InputNode
