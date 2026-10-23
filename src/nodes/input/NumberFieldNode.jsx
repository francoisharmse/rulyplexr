import { TextField } from '@mui/material'
import { fmt, monoInputStyle } from '../utils.jsx'

function NumberFieldNode({ data }) {
  return (
    <TextField
      size="small"
      variant="outlined"
      fullWidth
      type="number"
      placeholder="0"
      disabled={!!data.wired}
      value={data.wired ? fmt(data.wiredValue) : data.params?.value ?? ''}
      onChange={(e) => data.onParamChange?.('value', e.target.value)}
      slotProps={{ htmlInput: { style: monoInputStyle(!!data.wired) } }}
    />
  )
}

export default NumberFieldNode
