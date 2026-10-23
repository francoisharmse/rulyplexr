import { Handle, NodeResizeControl, Position } from '@xyflow/react'
import { Box, Chip, IconButton, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import UploadFileIcon from '@mui/icons-material/UploadFile'

export const TYPE_COLORS = {
  string: '#66d19e',
  number: '#5eb4ff',
  boolean: '#ffb35e',
  null: '#8a8f9e',
  object: '#c792ea',
  array: '#ff6eb4',
}

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s)

function preview(v) {
  if (v === null) return 'null'
  if (typeof v === 'string') return `"${truncate(v, 40)}"`
  if (typeof v === 'object') return truncate(JSON.stringify(v), 48)
  return String(v)
}

export function toEntries(value) {
  if (Array.isArray(value)) return value.map((v, i) => [String(i), v])
  if (value !== null && typeof value === 'object') return Object.entries(value)
  return [['value', value]]
}

const isField = (v) =>
  v !== null && !Array.isArray(v) && typeof v === 'object' && typeof v.type === 'string'

const MAX_DEPTH = 1
const EMPTY_SET = new Set()

const isExpandableValue = (v) =>
  v !== null && typeof v === 'object' && !isField(v) && toEntries(v).length > 0

const isHiddenByCollapse = (id, collapsed) => {
  const segs = id.split('.')
  for (let i = 1; i < segs.length; i++) {
    if (collapsed.has(segs.slice(0, i).join('.'))) return true
  }
  return false
}

export function toRows(value, maxDepth = MAX_DEPTH) {
  const rows = []
  const walk = (v, id, key, depth) => {
    rows.push({ id, key, value: v, depth })
    if (v !== null && typeof v === 'object' && !isField(v) && depth < maxDepth) {
      for (const [k, child] of toEntries(v)) walk(child, `${id}.${k}`, k, depth + 1)
    }
  }
  for (const [k, v] of toEntries(value)) walk(v, k, k, 0)
  return rows
}

function JsonNode({ data, selected }) {
  const { name, value } = data
  const entries = toEntries(value)
  const rows = toRows(value)
  const collapsed = data.collapsedIds ?? EMPTY_SET
  const visibleRows = collapsed.size
    ? rows.filter((r) => !isHiddenByCollapse(r.id, collapsed))
    : rows
  const rootType = typeOf(value)

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 260,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: data.highlighted ? '#e6e2ff' : 'primary.main',
        boxShadow: data.highlighted ? '0 0 0 1.5px #e6e2ff' : 6,
        borderRadius: '4px',
      }}
    >
      {selected && (
        <NodeResizeControl
          position="right"
          variant="line"
          resizeDirection="horizontal"
          minWidth={260}
          color="#7c6cff"
          style={{ width: 8, transform: 'translate(-100%, 0)' }}
        />
      )}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 1.5,
          py: 1,
          borderRadius: '3px 3px 0 0',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
          {name}
          {data.subName && (
            <Typography
              component="span"
              variant="caption"
              noWrap
              sx={{ ml: 0.75, opacity: 0.75, fontWeight: 400 }}
            >
              {data.subName}
            </Typography>
          )}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {data.onPasteJson && (
            <IconButton
              size="small"
              className="nodrag"
              title="Paste JSON"
              onClick={(e) => {
                e.stopPropagation()
                data.onPasteJson?.()
              }}
              sx={{ color: 'inherit', p: 0.25 }}
            >
              <ContentPasteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
          {data.onBrowse && (
            <IconButton
              size="small"
              className="nodrag"
              title="Browse for a JSON file"
              onClick={(e) => {
                e.stopPropagation()
                data.onBrowse?.()
              }}
              sx={{ color: 'inherit', p: 0.25 }}
            >
              <UploadFileIcon sx={{ fontSize: 15 }} />
            </IconButton>
          )}
          <Chip
            size="small"
            label={`${rootType} · ${entries.length} ${entries.length === 1 ? 'prop' : 'props'}`}
            sx={{ bgcolor: 'rgba(0,0,0,0.25)', color: 'inherit', height: 20 }}
          />
        </Box>
        {data.rootHandle && (
          <Handle
            type="source"
            position={Position.Right}
            id="s-root"
            className="rf-multi"
            style={{ right: -4 }}
          />
        )}
      </Box>

      <Box>
        {visibleRows.map((row) => {
          const fieldType = isField(row.value) ? row.value.type : null
          const t = fieldType ?? typeOf(row.value)
          const computed = data.values?.[row.id]
          const expandable = row.depth < MAX_DEPTH && isExpandableValue(row.value)
          const isCollapsed = collapsed.has(row.id)
          return (
            <Box
              key={row.id}
              className="nodrag"
              onClick={(e) => {
                e.stopPropagation()
                data.onRowClick?.(row.id)
              }}
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                pr: 3,
                pl: 3 + row.depth * 1.75,
                py: 0.75,
                borderBottom: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                bgcolor: data.selectedIds?.includes(row.id) ? 'rgba(157,146,255,0.22)' : 'transparent',
                '&:last-child': { borderBottom: 'none' },
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Handle
                type="target"
                position={Position.Left}
                id={`t-${row.id}`}
                className="rf-single"
                style={{ left: -4 }}
              />
              <Box sx={{ width: 18, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {expandable && (
                  <IconButton
                    size="small"
                    className="nodrag"
                    onClick={(e) => {
                      e.stopPropagation()
                      data.onToggle?.(row.id)
                    }}
                    sx={{ p: 0, width: 18, height: 18, color: 'text.secondary' }}
                  >
                    {isCollapsed ? (
                      <KeyboardArrowRightIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: 16 }} />
                    )}
                  </IconButton>
                )}
              </Box>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontWeight: 600, minWidth: 0 }}
                noWrap
                title={row.id}
              >
                {row.key}
                {isCollapsed && (
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ fontFamily: 'monospace', color: 'text.disabled', ml: 0.75 }}
                  >
                    +{toEntries(row.value).length}
                  </Typography>
                )}
              </Typography>
              <Chip
                size="small"
                label={t}
                sx={{
                  height: 18,
                  fontSize: 10,
                  bgcolor: 'transparent',
                  border: '1px solid',
                  borderColor: fieldType ? '#9d92ff' : (TYPE_COLORS[t] ?? '#8a8f9e'),
                  color: fieldType ? '#9d92ff' : (TYPE_COLORS[t] ?? '#8a8f9e'),
                }}
              />
              {fieldType == null ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ fontFamily: 'monospace', ml: 'auto', maxWidth: 150, minWidth: 0 }}
                  title={preview(row.value)}
                >
                  {preview(row.value)}
                </Typography>
              ) : (
                computed !== undefined && (
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ fontFamily: 'monospace', ml: 'auto', maxWidth: 150, minWidth: 0, color: '#66d19e' }}
                    title={String(computed)}
                  >
                    {String(computed)}
                  </Typography>
                )
              )}
              <Handle
                type="source"
                position={Position.Right}
                id={`s-${row.id}`}
                className="rf-multi"
                style={{ right: -4 }}
              />
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default JsonNode
