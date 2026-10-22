import { Handle, NodeResizeControl, Position } from '@xyflow/react'
import { Box, Typography } from '@mui/material'
import AbcIcon from '@mui/icons-material/Abc'
import NumbersIcon from '@mui/icons-material/Numbers'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import DataArrayIcon from '@mui/icons-material/DataArray'
import INPUT_NODES from './index.js'

const TYPE_ICONS = {
  string: AbcIcon,
  number: NumbersIcon,
  boolean: ToggleOnIcon,
  array: DataArrayIcon,
}

function InputNode({ data, selected }) {
  const def = INPUT_NODES[data.kind] ?? INPUT_NODES.string_field
  const Icon = TYPE_ICONS[def.type] ?? AbcIcon
  const Editor = def.editor

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 160,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: data.highlighted ? '#e6e2ff' : '#5eb4ff',
        boxShadow: data.highlighted ? '0 0 0 1.5px #e6e2ff' : 6,
        borderRadius: '4px',
      }}
    >
      {selected && (
        <NodeResizeControl
          position="right"
          variant="line"
          resizeDirection="horizontal"
          minWidth={160}
          color="#5eb4ff"
          style={{ width: 8, transform: 'translate(-100%, 0)' }}
        />
      )}
      <Handle type="target" position={Position.Left} id="in" className="rf-single" />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.75,
          bgcolor: 'rgba(94,180,255,0.18)',
          color: '#5eb4ff',
          borderRadius: '3px 3px 0 0',
        }}
      >
        <Icon sx={{ fontSize: 16 }} />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {data.label ?? def.label}
        </Typography>
      </Box>
      <Box className="nodrag" sx={{ px: 1.25, py: 1 }}>
        {Editor && <Editor data={data} />}
      </Box>
      <Handle type="source" position={Position.Right} id="out" className="rf-multi" />
    </Box>
  )
}

export default InputNode
