import { useState } from 'react'
import { Handle, NodeResizeControl, Position } from '@xyflow/react'
import { Box, Button, Chip, IconButton, MenuItem, Popover, TextField, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import EditIcon from '@mui/icons-material/Edit'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'

export const TYPE_COLORS = {
  string: '#66d19e',
  number: '#5eb4ff',
  boolean: '#ffb35e',
  null: '#8a8f9e',
  object: '#c792ea',
  array: '#ff6eb4',
}

export const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)

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

export const isField = (v) =>
  v !== null && !Array.isArray(v) && typeof v === 'object' && typeof v.type === 'string'

const MAX_DEPTH = 1
const EMPTY_SET = new Set()
const FIELD_TYPES = [
  'string',
  'number',
  'boolean',
  'array',
  'object',
  'null',
  'analog_input',
  'digital_input',
]

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
  const walk = (v, id, key, depth, inArray) => {
    const single =
      inArray &&
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !isField(v) &&
      Object.keys(v).length === 1
    if (single) {
      const [k, child] = Object.entries(v)[0]
      const cid = `${id}.${k}`
      rows.push({ id: cid, key: k, value: child, depth, delId: id })
      if (child !== null && typeof child === 'object' && !isField(child) && depth < maxDepth) {
        for (const [ck, cv] of toEntries(child))
          walk(cv, `${cid}.${ck}`, ck, depth + 1, Array.isArray(child))
      }
      return
    }
    rows.push({ id, key, value: v, depth })
    if (v !== null && typeof v === 'object' && !isField(v) && depth < maxDepth) {
      for (const [k, child] of toEntries(v))
        walk(child, `${id}.${k}`, k, depth + 1, Array.isArray(v))
    }
  }
  for (const [k, v] of toEntries(value)) walk(v, k, k, 0, Array.isArray(value))
  return rows
}

function JsonNode({ data, selected, footer }) {
  const { name, value } = data
  const [edit, setEdit] = useState(null)
  const [add, setAdd] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [dropHint, setDropHint] = useState(null)
  const entries = toEntries(value)
  const maxDepth = data.maxDepth ?? MAX_DEPTH
  const rows = toRows(value, maxDepth)
  const collapsed = data.collapsedIds ?? EMPTY_SET
  const visibleRows = collapsed.size
    ? rows.filter((r) => !isHiddenByCollapse(r.id, collapsed))
    : rows
  const rootType = typeOf(value)

  const openFieldEditor = (row, anchor) => {
    const f = isField(row.value) ? row.value : {}
    const segs = row.id.split('.')
    const parent = segs.slice(0, -1).reduce((o, k) => o?.[k], value)
    setEdit({
      row,
      anchor,
      isArrayItem: Array.isArray(parent),
      name: row.key,
      type: f.type ?? 'string',
      unit: f.unit ?? '',
      source: f.source ?? '',
    })
  }

  const saveField = () => {
    data.onFieldSave?.(edit.row.id, {
      name: edit.name.trim() || edit.row.key,
      type: edit.type,
      unit: edit.unit.trim(),
      source: edit.source.trim(),
    })
    setEdit(null)
  }

  const openAddChild = (row, anchor) => {
    const parent = row ? row.value : value
    setAdd({
      row,
      anchor,
      isArrayItem: Array.isArray(parent),
      name: '',
      type: 'string',
      unit: '',
    })
  }

  const saveChild = () => {
    data.onAddChild?.(add.row?.id ?? '', {
      name: add.name.trim(),
      type: add.type,
      unit: add.unit.trim(),
    })
    setAdd(null)
  }

  const sortIdOf = (row) => row.delId ?? row.id
  const parentOf = (id) => id.split('.').slice(0, -1).join('.')

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
          {data.onAddChild && (
            <IconButton
              size="small"
              className="nodrag"
              title="Add field"
              onClick={(e) => {
                e.stopPropagation()
                openAddChild(null, e.currentTarget)
              }}
              sx={{ color: 'inherit', p: 0.25 }}
            >
              <AddIcon sx={{ fontSize: 15 }} />
            </IconButton>
          )}
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
          const expandable = row.depth < maxDepth && isExpandableValue(row.value)
          const isCollapsed = collapsed.has(row.id)
          const sortId = sortIdOf(row)
          const droppable =
            dragId !== null &&
            dragId !== sortId &&
            parentOf(dragId) === parentOf(sortId)
          return (
            <Box
              key={row.id}
              className="nodrag"
              onClick={(e) => {
                e.stopPropagation()
                data.onRowClick?.(row.id)
              }}
              onDragOver={(e) => {
                if (!droppable) return
                e.preventDefault()
                e.stopPropagation()
                const rect = e.currentTarget.getBoundingClientRect()
                const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
                if (dropHint?.id !== row.id || dropHint.pos !== pos)
                  setDropHint({ id: row.id, pos })
              }}
              onDragLeave={() =>
                setDropHint((h) => (h?.id === row.id ? null : h))
              }
              onDrop={(e) => {
                if (!dragId || !droppable) return
                e.preventDefault()
                e.stopPropagation()
                data.onFieldMove?.(
                  dragId,
                  sortId,
                  dropHint?.id === row.id ? dropHint.pos : 'after',
                )
                setDragId(null)
                setDropHint(null)
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
                '&:hover .row-actions': { opacity: 1, pointerEvents: 'auto' },
                ...(dropHint?.id === row.id && {
                  boxShadow:
                    dropHint.pos === 'before'
                      ? 'inset 0 2px 0 0 #9d92ff'
                      : 'inset 0 -2px 0 0 #9d92ff',
                }),
                ...(dragId === sortId && { opacity: 0.4 }),
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
              {data.onFieldDelete && (
                <Box
                  className="row-actions"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                    flexShrink: 0,
                    ml: fieldType != null && computed === undefined ? 'auto' : 0,
                    opacity: 0,
                    pointerEvents: 'none',
                    transition: 'opacity 120ms',
                  }}
                >
                  {data.onFieldMove && (
                    <IconButton
                      size="small"
                      className="nodrag"
                      title="Drag to reorder"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', sortId)
                        e.dataTransfer.effectAllowed = 'move'
                        setDragId(sortId)
                      }}
                      onDragEnd={() => {
                        setDragId(null)
                        setDropHint(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ p: 0.25, color: 'text.secondary', cursor: 'grab' }}
                    >
                      <DragIndicatorIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                  {data.onAddChild &&
                    (isField(row.value)
                      ? row.value.type === 'object' || row.value.type === 'array'
                      : row.value !== null && typeof row.value === 'object') && (
                      <IconButton
                        size="small"
                        className="nodrag"
                        title="Add sub-field"
                        onClick={(e) => {
                          e.stopPropagation()
                          openAddChild(row, e.currentTarget)
                        }}
                        sx={{ p: 0.25, color: 'text.secondary' }}
                      >
                        <AddIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  {data.onFieldSave && isField(row.value) && (
                    <IconButton
                      size="small"
                      className="nodrag"
                      title="Edit field"
                      onClick={(e) => {
                        e.stopPropagation()
                        openFieldEditor(row, e.currentTarget)
                      }}
                      sx={{ p: 0.25, color: 'text.secondary' }}
                    >
                      <EditIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    className="nodrag"
                    title="Delete field"
                    onClick={(e) => {
                      e.stopPropagation()
                      data.onFieldDelete?.(row.delId ?? row.id)
                    }}
                    sx={{ p: 0.25, color: 'text.secondary' }}
                  >
                    <DeleteOutlinedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
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
      {footer}
      <Popover
        open={!!edit}
        anchorEl={edit?.anchor ?? null}
        onClose={() => setEdit(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { className: 'nodrag' } }}
      >
        {edit && (
          <Box
            sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <TextField
              size="small"
              label="Name"
              value={edit.name}
              disabled={edit.isArrayItem}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && saveField()}
              slotProps={{
                inputLabel: { sx: { fontSize: 11 } },
                htmlInput: { style: { fontFamily: 'monospace', fontSize: 12, padding: '5px 8px' } },
              }}
            />
            <TextField
              select
              size="small"
              label="Type"
              value={edit.type}
              onChange={(e) => setEdit({ ...edit, type: e.target.value })}
              slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
              sx={{ '& .MuiSelect-select': { fontFamily: 'monospace', fontSize: 12, py: 0.5 } }}
            >
              {(FIELD_TYPES.includes(edit.type) ? FIELD_TYPES : [edit.type, ...FIELD_TYPES]).map(
                (t) => (
                  <MenuItem key={t} value={t} sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {t}
                  </MenuItem>
                ),
              )}
            </TextField>
            <TextField
              size="small"
              label="Unit"
              value={edit.unit}
              onChange={(e) => setEdit({ ...edit, unit: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && saveField()}
              slotProps={{
                inputLabel: { sx: { fontSize: 11 } },
                htmlInput: { style: { fontFamily: 'monospace', fontSize: 12, padding: '5px 8px' } },
              }}
            />
            <TextField
              size="small"
              label="Source"
              value={edit.source}
              onChange={(e) => setEdit({ ...edit, source: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && saveField()}
              slotProps={{
                inputLabel: { sx: { fontSize: 11 } },
                htmlInput: { style: { fontFamily: 'monospace', fontSize: 12, padding: '5px 8px' } },
              }}
            />
            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
              <Button
                size="small"
                color="error"
                startIcon={<DeleteOutlinedIcon sx={{ fontSize: 14 }} />}
                onClick={() => {
                  data.onFieldDelete?.(edit.row.delId ?? edit.row.id)
                  setEdit(null)
                }}
                sx={{ fontSize: 11, textTransform: 'none', px: 1 }}
              >
                Delete
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={saveField}
                disabled={!edit.name.trim() && !edit.isArrayItem}
                sx={{ fontSize: 11, textTransform: 'none', px: 1 }}
              >
                Save
              </Button>
            </Box>
          </Box>
        )}
      </Popover>
      <Popover
        open={!!add}
        anchorEl={add?.anchor ?? null}
        onClose={() => setAdd(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { className: 'nodrag' } }}
      >
        {add && (
          <Box
            sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <TextField
              size="small"
              label={add.isArrayItem ? 'Name (optional)' : 'Name'}
              value={add.name}
              autoFocus
              onChange={(e) => setAdd({ ...add, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && saveChild()}
              slotProps={{
                inputLabel: { sx: { fontSize: 11 } },
                htmlInput: { style: { fontFamily: 'monospace', fontSize: 12, padding: '5px 8px' } },
              }}
            />
            <TextField
              select
              size="small"
              label="Type"
              value={add.type}
              onChange={(e) => setAdd({ ...add, type: e.target.value })}
              slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
              sx={{ '& .MuiSelect-select': { fontFamily: 'monospace', fontSize: 12, py: 0.5 } }}
            >
              {FIELD_TYPES.map((t) => (
                <MenuItem key={t} value={t} sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Unit"
              value={add.unit}
              onChange={(e) => setAdd({ ...add, unit: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && saveChild()}
              slotProps={{
                inputLabel: { sx: { fontSize: 11 } },
                htmlInput: { style: { fontFamily: 'monospace', fontSize: 12, padding: '5px 8px' } },
              }}
            />
            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
              <Button
                size="small"
                onClick={() => setAdd(null)}
                sx={{ fontSize: 11, textTransform: 'none', px: 1 }}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={saveChild}
                disabled={!add.isArrayItem && !add.name.trim()}
                sx={{ fontSize: 11, textTransform: 'none', px: 1 }}
              >
                Add
              </Button>
            </Box>
          </Box>
        )}
      </Popover>
    </Box>
  )
}

export default JsonNode
