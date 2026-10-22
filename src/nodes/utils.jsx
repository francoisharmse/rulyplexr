import { Box } from '@mui/material'

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
