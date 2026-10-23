import { Handle, NodeResizeControl, Position } from '@xyflow/react'
import { Box, Typography } from '@mui/material'
import DataObjectIcon from '@mui/icons-material/DataObject'
import OUTPUT_NODES from './index.js'

const ACCENT = '#66d19e'

function RuleOutputNode({ data, selected }) {
  const def = OUTPUT_NODES[data.kind]
  const Body = def?.component
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
          bgcolor: 'rgba(102,209,158,0.18)',
          color: ACCENT,
          borderRadius: '3px 3px 0 0',
        }}
      >
        <DataObjectIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {def?.label ?? data.kind}
        </Typography>
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="rf-multi"
          style={{ right: -4 }}
        />
      </Box>
      {Body && <Body data={data} def={def} />}
    </Box>
  )
}

export default RuleOutputNode
