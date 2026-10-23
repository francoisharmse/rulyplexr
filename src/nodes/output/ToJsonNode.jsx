import { Handle, Position } from '@xyflow/react'
import { Box, Chip, MenuItem, Switch, TextField, Typography } from '@mui/material'
import { TYPE_COLORS } from '../input/JsonNode.jsx'
import { AssembledBar, previewText } from '../utils.jsx'

const ACCENT = '#66d19e'
const INDENT_OPTIONS = ['0', '1', '2', '4', '8', 'tab']

function ToJsonNode({ data, def }) {
  const field = def?.fields?.[0]
  const v = data.fieldValues?.[field?.key]
  const shown = v === undefined ? field?.default : v
  const params = data.params ?? {}
  const chipColor = TYPE_COLORS[field?.type] ?? ACCENT
  const isOn = (x) => x === true || x === 'true'

  return (
    <>
      <Box>
        <Box
          className="nodrag"
          onClick={() => data.onRowClick?.(field?.key)}
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            pl: 3,
            pr: 1.5,
            py: 0.6,
            cursor: 'pointer',
            bgcolor: data.selectedIds?.includes(field?.key)
              ? 'rgba(157,146,255,0.22)'
              : 'transparent',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Handle
            type="target"
            position={Position.Left}
            id={`t-${field?.key}`}
            className="rf-single"
            style={{ left: -4 }}
          />
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', fontWeight: 600, minWidth: 0, flexShrink: 0 }}
            noWrap
          >
            {field?.key}
          </Typography>
          <Chip
            size="small"
            label={field?.type}
            sx={{
              height: 18,
              fontSize: 10,
              bgcolor: 'transparent',
              border: '1px solid',
              borderColor: chipColor,
              color: chipColor,
            }}
          />
          <Typography
            variant="caption"
            noWrap
            sx={{
              ml: 'auto',
              fontFamily: 'monospace',
              maxWidth: 110,
              minWidth: 0,
              color: ACCENT,
            }}
            title={JSON.stringify(shown)}
          >
            {previewText(shown)}
          </Typography>
        </Box>
      </Box>
      <Box
        className="nodrag"
        sx={{
          px: 1.25,
          py: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <TextField
          select
          size="small"
          label="Indent"
          value={params.indent ?? '2'}
          onChange={(e) => data.onParamChange?.('indent', e.target.value)}
          slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
          sx={{ '& .MuiSelect-select': { fontFamily: 'monospace', fontSize: 12, py: 0.5 } }}
        >
          {INDENT_OPTIONS.map((o) => (
            <MenuItem key={o} value={o} sx={{ fontFamily: 'monospace', fontSize: 12 }}>
              {o === 'tab' ? 'tab' : `${o} space${o === '1' ? '' : 's'}`}
            </MenuItem>
          ))}
        </TextField>
        {[
          ['sortKeys', 'Sort keys'],
          ['ensureAscii', 'Escape non-ASCII'],
        ].map(([key, label]) => (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Switch
              size="small"
              checked={isOn(params[key])}
              onChange={(e) => data.onParamChange?.(key, e.target.checked)}
            />
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
      <AssembledBar
        value={data.assembled}
        open={!!data.collapsedIds?.has('__assembled')}
        onToggle={data.onToggle}
        accent={ACCENT}
      />
    </>
  )
}

export default ToJsonNode
