import { Handle, Position } from '@xyflow/react'
import { Box, Chip, Typography } from '@mui/material'

const TYPE_COLORS = {
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

export function toRows(value, maxDepth = 1) {
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

function JsonNode({ data }) {
  const { name, value } = data
  const entries = toEntries(value)
  const rows = toRows(value)
  const rootType = typeOf(value)

  return (
    <Box
      sx={{
        width: 360,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '4px',
        boxShadow: 6,
      }}
    >
      <Box
        sx={{
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
        </Typography>
        <Chip
          size="small"
          label={`${rootType} · ${entries.length} ${entries.length === 1 ? 'prop' : 'props'}`}
          sx={{ bgcolor: 'rgba(0,0,0,0.25)', color: 'inherit', height: 20 }}
        />
      </Box>

      <Box>
        {rows.map((row) => {
          const fieldType = isField(row.value) ? row.value.type : null
          const t = fieldType ?? typeOf(row.value)
          const computed = data.values?.[row.id]
          return (
            <Box
              key={row.id}
              className="nodrag"
              onClick={() => data.onRowClick?.(row.id)}
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
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontWeight: 600, minWidth: 90, flexShrink: 0 }}
                noWrap
                title={row.id}
              >
                {row.key}
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
                  sx={{ fontFamily: 'monospace', ml: 'auto', maxWidth: 150 }}
                  title={preview(row.value)}
                >
                  {preview(row.value)}
                </Typography>
              ) : (
                computed !== undefined && (
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ fontFamily: 'monospace', ml: 'auto', maxWidth: 150, color: '#66d19e' }}
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
