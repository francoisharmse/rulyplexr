import { Handle, Position } from '@xyflow/react'
import { Box, Chip, Collapse, IconButton, TextField, Typography } from '@mui/material'
import DataObjectIcon from '@mui/icons-material/DataObject'
import BugReportIcon from '@mui/icons-material/BugReport'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OUTPUT_NODES from './outputNodes.js'
import { TYPE_COLORS } from './JsonNode.jsx'

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s)

const dump = (v) => {
  if (v === undefined) return 'undefined'
  try {
    return JSON.stringify(v, null, 2) ?? String(v)
  } catch {
    return String(v)
  }
}

const previewText = (v) =>
  v === undefined
    ? '—'
    : typeof v === 'object'
      ? truncate(JSON.stringify(v), 24)
      : String(v)

function DumpBox({ value, accent = '#66d19e' }) {
  return (
    <Box
      className="nodrag nowheel"
      sx={{
        m: 1,
        mt: 0.5,
        p: 1,
        bgcolor: 'rgba(0,0,0,0.3)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '4px',
        maxHeight: 220,
        overflow: 'auto',
      }}
    >
      <Box
        component="pre"
        sx={{
          m: 0,
          fontFamily: 'monospace',
          fontSize: 11,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: accent,
        }}
      >
        {dump(value)}
      </Box>
    </Box>
  )
}

function RuleOutputNode({ data }) {
  const def = OUTPUT_NODES[data.kind]
  const fields = def?.fields ?? []
  const assembledOpen = !!data.collapsedIds?.has('__assembled')
  const accent = def?.debug ? '#ffa726' : '#66d19e'
  const accentBg = def?.debug ? 'rgba(255,167,38,0.18)' : 'rgba(102,209,158,0.18)'
  return (
    <Box
      sx={{
        width: 260,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: data.highlighted ? '#e6e2ff' : accent,
        boxShadow: data.highlighted ? '0 0 0 1.5px #e6e2ff' : 6,
        borderRadius: '4px',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.75,
          bgcolor: accentBg,
          color: accent,
          borderRadius: '3px 3px 0 0',
        }}
      >
        {def?.debug ? (
          <BugReportIcon sx={{ fontSize: 14 }} />
        ) : (
          <DataObjectIcon sx={{ fontSize: 14 }} />
        )}
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {def?.label ?? data.kind}
        </Typography>
        {!def?.debug && (
          <Handle
            type="source"
            position={Position.Right}
            id="out"
            className="rf-multi"
            style={{ right: -4 }}
          />
        )}
      </Box>
      <Box>
        {fields.map((f) => {
          const v = data.fieldValues?.[f.key]
          const shown = v === undefined ? f.default : v
          const expandable = shown !== null && typeof shown === 'object'
          const toggleable = !!def?.debug || expandable
          const chipColor = TYPE_COLORS[f.type] ?? accent
          const open = def?.debug
            ? !data.collapsedIds?.has(f.key)
            : !!data.collapsedIds?.has(f.key)
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
                  {(!toggleable || !open) && (
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{ fontFamily: 'monospace', maxWidth: 110, minWidth: 0, color: accent }}
                      title={JSON.stringify(shown)}
                    >
                      {previewText(shown)}
                    </Typography>
                  )}
                  {toggleable && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        data.onToggle?.(f.key)
                      }}
                      sx={{ p: 0, color: accent }}
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
            {toggleable && (
              <Collapse in={open}>
                <DumpBox value={shown} accent={accent} />
              </Collapse>
            )}
            </Box>
          )
        })}
      </Box>
      {!def?.debug && (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ px: 1.25, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="caption"
              noWrap
              title={JSON.stringify(data.assembled)}
              sx={{
                flex: 1,
                minWidth: 0,
                fontFamily: 'monospace',
                color: data.assembled ? accent : 'text.disabled',
              }}
            >
              {data.assembled ? truncate(JSON.stringify(data.assembled), 60) : '—'}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                data.onToggle?.('__assembled')
              }}
              sx={{ p: 0, color: accent }}
            >
              <ExpandMoreIcon
                sx={{
                  fontSize: 16,
                  transform: assembledOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 150ms',
                }}
              />
            </IconButton>
          </Box>
          <Collapse in={assembledOpen}>
            <DumpBox value={data.assembled} accent={accent} />
          </Collapse>
        </Box>
      )}
    </Box>
  )
}

export default RuleOutputNode
