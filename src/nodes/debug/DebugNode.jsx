import { Handle, NodeResizeControl, Position } from '@xyflow/react'
import { Box, Chip, Collapse, IconButton, Typography } from '@mui/material'
import BugReportIcon from '@mui/icons-material/BugReport'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DEBUG_NODES from './index.js'
import { TYPE_COLORS } from '../input/JsonNode.jsx'
import { CopyButton, DumpBox, previewText } from '../utils.jsx'

const ACCENT = '#ffa726'

function DebugNode({ data, selected }) {
  const def = DEBUG_NODES[data.kind]
  const fields = def?.fields ?? []
  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 200,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: data.highlighted ? '#e6e2ff' : ACCENT,
        boxShadow: data.highlighted ? '0 0 0 1.5px #e6e2ff' : 6,
        borderRadius: '4px',
      }}
    >
      {selected && (
        <NodeResizeControl
          position="right"
          variant="line"
          resizeDirection="horizontal"
          minWidth={200}
          color={ACCENT}
          style={{ width: 8, transform: 'translate(-100%, 0)' }}
        />
      )}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.75,
          bgcolor: 'rgba(255,167,38,0.18)',
          color: ACCENT,
          borderRadius: '3px 3px 0 0',
        }}
      >
        <BugReportIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {def?.label ?? data.kind}
        </Typography>
      </Box>
      <Box>
        {fields.map((f) => {
          const v = data.fieldValues?.[f.key]
          const shown = v === undefined ? f.default : v
          const chipColor = TYPE_COLORS[f.type] ?? ACCENT
          const open = !data.collapsedIds?.has(f.key)
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
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                {!open && (
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ fontFamily: 'monospace', maxWidth: 110, minWidth: 0, color: ACCENT }}
                    title={JSON.stringify(shown)}
                  >
                    {previewText(shown)}
                  </Typography>
                )}
                <CopyButton value={shown} accent={ACCENT} />
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
              </Box>
            </Box>
            <Collapse in={open}>
              <DumpBox value={shown} accent={ACCENT} />
            </Collapse>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default DebugNode
