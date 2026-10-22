import { Box, Switch, Typography } from '@mui/material'

function BooleanFieldNode({ data }) {
  const boolVal = data.wired ? !!data.wiredValue : !!data.params?.value
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Switch
        size="small"
        disabled={!!data.wired}
        checked={boolVal}
        onChange={(e) => data.onParamChange?.('value', e.target.checked)}
      />
      <Typography
        variant="caption"
        sx={{
          fontFamily: 'monospace',
          fontSize: 12,
          color: data.wired ? '#e6e2ff' : 'text.secondary',
        }}
      >
        {String(boolVal)}
      </Typography>
    </Box>
  )
}

export default BooleanFieldNode
