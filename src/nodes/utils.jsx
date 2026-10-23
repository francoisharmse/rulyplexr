import { Box, Collapse, IconButton, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

export const truncate = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s)

export const dump = (v) => {
  if (v === undefined) return 'undefined'
  try {
    return JSON.stringify(v, null, 2) ?? String(v)
  } catch {
    return String(v)
  }
}

export const previewText = (v) =>
  v === undefined
    ? '—'
    : typeof v === 'object'
      ? truncate(JSON.stringify(v), 24)
      : String(v)

export const fmt = (v) =>
  v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)

export const monoInputStyle = (wired) => ({
  fontFamily: 'monospace',
  fontSize: 12,
  padding: '5px 8px',
  ...(wired ? { WebkitTextFillColor: '#e6e2ff' } : {}),
})

export function AssembledBar({ value, open, onToggle, accent = '#66d19e' }) {
  return (
    <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ px: 1.25, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          variant="caption"
          noWrap
          title={typeof value === 'string' ? value : JSON.stringify(value)}
          sx={{
            flex: 1,
            minWidth: 0,
            fontFamily: 'monospace',
            color: value != null ? accent : 'text.disabled',
          }}
        >
          {value != null ? truncate(String(value), 60) : '—'}
        </Typography>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggle?.('__assembled') }} sx={{ p: 0, color: accent }}>
          <ExpandMoreIcon
            sx={{
              fontSize: 16,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 150ms',
            }}
          />
        </IconButton>
      </Box>
      <Collapse in={open}>
        <DumpBox value={value} accent={accent} />
      </Collapse>
    </Box>
  )
}

export function DumpBox({ value, accent = '#66d19e' }) {
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
