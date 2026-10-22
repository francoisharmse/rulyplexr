import { TextField } from '@mui/material'
import { fmt, monoInputStyle } from '../utils.jsx'

function StringFieldNode({ data }) {
  return (
    <TextField
      size="small"
      variant="outlined"
      fullWidth
      placeholder="value"
      disabled={!!data.wired}
      value={data.wired ? fmt(data.wiredValue) : data.params?.value ?? ''}
      onChange={(e) => data.onParamChange?.('value', e.target.value)}
      slotProps={{ htmlInput: { style: monoInputStyle(!!data.wired) } }}
    />
  )
}

export default StringFieldNode
