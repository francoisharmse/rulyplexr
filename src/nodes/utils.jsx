import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Box, Chip, Collapse, IconButton, MenuItem, Switch, TextField, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'

export const truncate = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s)

export const dump = (v) => {
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return v
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

export const isOn = (v) => v === true || v === 'true'

export function InputFieldRow({ data, field, accent = '#66d19e', chipColor }) {
  const v = data.fieldValues?.[field?.key]
  const shown = v === undefined ? field?.default : v
  return (
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
          borderColor: chipColor ?? accent,
          color: chipColor ?? accent,
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
          color: accent,
        }}
        title={JSON.stringify(shown)}
      >
        {previewText(shown)}
      </Typography>
    </Box>
  )
}

export function ParamControls({ data, params }) {
  if (!params?.length) return null
  const p = data.params ?? {}
  return (
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
      {params.map((spec) =>
        spec.type === 'select' ? (
          <TextField
            select
            key={spec.key}
            size="small"
            label={spec.label}
            value={p[spec.key] ?? spec.default ?? ''}
            onChange={(e) => data.onParamChange?.(spec.key, e.target.value)}
            slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
            sx={{ '& .MuiSelect-select': { fontFamily: 'monospace', fontSize: 12, py: 0.5 } }}
          >
            {spec.options.map((o) => {
              const { value, label } = typeof o === 'object' ? o : { value: o, label: o }
              return (
                <MenuItem key={value} value={value} sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {label}
                </MenuItem>
              )
            })}
          </TextField>
        ) : (
          <Box key={spec.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Switch
              size="small"
              checked={isOn(p[spec.key] ?? spec.default)}
              onChange={(e) => data.onParamChange?.(spec.key, e.target.checked)}
            />
            <Typography variant="caption" color="text.secondary">
              {spec.label}
            </Typography>
          </Box>
        ),
      )}
    </Box>
  )
}

export function CopyButton({ value, accent = '#66d19e' }) {
  const [copied, setCopied] = useState(false)
  const copy = (e) => {
    e.stopPropagation()
    const text =
      typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? ''
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <IconButton
      size="small"
      onClick={copy}
      title="Copy output"
      disabled={value == null}
      sx={{ p: 0, color: accent }}
    >
      {copied ? <CheckIcon sx={{ fontSize: 15 }} /> : <ContentCopyIcon sx={{ fontSize: 13 }} />}
    </IconButton>
  )
}

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
        <CopyButton value={value} accent={accent} />
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
