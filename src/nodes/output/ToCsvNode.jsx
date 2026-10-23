import { AssembledBar, InputFieldRow, ParamControls } from '../utils.jsx'
import { TYPE_COLORS } from '../input/JsonNode.jsx'

const ACCENT = '#66d19e'

function ToCsvNode({ data, def }) {
  const field = def?.fields?.[0]
  return (
    <>
      <InputFieldRow
        data={data}
        field={field}
        accent={ACCENT}
        chipColor={TYPE_COLORS[field?.type]}
      />
      <ParamControls data={data} params={def?.params} />
      <AssembledBar
        value={data.assembled}
        open={!!data.collapsedIds?.has('__assembled')}
        onToggle={data.onToggle}
        accent={ACCENT}
      />
    </>
  )
}

export default ToCsvNode
