import { Handle, Position } from '@xyflow/react'
import { Box, Typography } from '@mui/material'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'

function TransformNode({ data }) {
  return (
    <Box
      sx={{
        width: 200,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: data.highlighted ? '#e6e2ff' : '#9d92ff',
        boxShadow: data.highlighted ? '0 0 0 1.5px #e6e2ff' : 6,
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <Handle type="target" position={Position.Left} id="in" className="rf-single" />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.75,
          bgcolor: 'rgba(157,146,255,0.25)',
          color: '#e6e2ff',
        }}
      >
        <AutoFixHighIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {data.label}
        </Typography>
      </Box>
      <Box sx={{ px: 1.25, py: 0.75 }}>
        <Typography
          variant="caption"
          noWrap
          title={data.preview ?? '—'}
          sx={{ fontFamily: 'monospace', color: data.preview != null ? '#66d19e' : 'text.disabled' }}
        >
          {data.preview ?? '—'}
        </Typography>
      </Box>
      <Handle type="source" position={Position.Right} id="out" className="rf-multi" />
    </Box>
  )
}

export default TransformNode
