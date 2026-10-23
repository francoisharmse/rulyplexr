import { Handle, Position } from '@xyflow/react'
import { Box, Chip, Collapse, IconButton, TextField, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { TYPE_COLORS } from '../input/JsonNode.jsx'
import { AssembledBar, DumpBox, previewText } from '../utils.jsx'

const ACCENT = '#66d19e'

function IotRuleNode({ data, def }) {
  const fields = def?.fields ?? []
  const assembledOpen = !!data.collapsedIds?.has('__assembled')
  return (
    <>
      <Box>
        {fields.map((f) => {
          const v = data.fieldValues?.[f.key]
          const shown = v === undefined ? f.default : v
          const expandable = shown !== null && typeof shown === 'object'
          const chipColor = TYPE_COLORS[f.type] ?? ACCENT
          const open = !!data.collapsedIds?.has(f.key)
          return (
            <Box key={f.key}>
            <Box
              className="nodrag"
              onClick={() => data.onRowClick?.(f.key)}
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                pl: 3,
                pr: 1.5,
                py: 0.6,
                borderBottom: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                bgcolor: data.selectedIds?.includes(f.key)
                  ? 'rgba(157,146,255,0.22)'
                  : 'transparent',
                '&:last-of-type': { borderBottom: 'none' },
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Handle
                type="target"
                position={Position.Left}
                id={`t-${f.key}`}
                className="rf-single"
                style={{ left: -4 }}
              />
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontWeight: 600, minWidth: 0, flexShrink: 0 }}
                noWrap
              >
                {f.key}
              </Typography>
              <Chip
                size="small"
                label={f.type}
                sx={{
                  height: 18,
                  fontSize: 10,
                  bgcolor: 'transparent',
                  border: '1px solid',
                  borderColor: chipColor,
                  color: chipColor,
                }}
              />
              {f.editable && !data.wired?.has(f.key) ? (
                <TextField
                  size="small"
                  variant="outlined"
                  placeholder={f.default ?? ''}
                  value={data.params?.[f.key] ?? ''}
                  onChange={(e) => data.onParamChange?.(f.key, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 11, padding: '2px 6px' } } }}
                  sx={{ ml: 'auto', width: 110, minWidth: 0 }}
                />
              ) : (
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                  {(!expandable || !open) && (
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{ fontFamily: 'monospace', maxWidth: 110, minWidth: 0, color: ACCENT }}
                      title={JSON.stringify(shown)}
                    >
                      {previewText(shown)}
                    </Typography>
                  )}
                  {expandable && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        data.onToggle?.(f.key)
                      }}
                      sx={{ p: 0, color: ACCENT }}
                    >
                      <ExpandMoreIcon
                        sx={{
                          fontSize: 16,
                          transform: open ? 'rotate(180deg)' : 'none',
                          transition: 'transform 150ms',
                        }}
                      />
                    </IconButton>
                  )}
                </Box>
              )}
            </Box>
            {expandable && (
              <Collapse in={open}>
                <DumpBox value={shown} accent={ACCENT} />
              </Collapse>
            )}
            </Box>
          )
        })}
      </Box>
      <AssembledBar
        value={data.assembled}
        open={assembledOpen}
        onToggle={data.onToggle}
        accent={ACCENT}
      />
    </>
  )
}

export default IotRuleNode
