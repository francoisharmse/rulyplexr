import IotRuleNode from './IotRuleNode.jsx'
import ToJsonNode from './ToJsonNode.jsx'

const sortReplacer = (key, val) =>
  val !== null && typeof val === 'object' && !Array.isArray(val)
    ? Object.fromEntries(Object.keys(val).sort().map((k) => [k, val[k]]))
    : val

const isOn = (v) => v === true || v === 'true'

const toJsonValue = (v) => {
  if (typeof v !== 'string') return v
  const t = v.trim()
  if (!t) return v
  try {
    return JSON.parse(t)
  } catch {
    return v
  }
}

export const toJsonString = (v, params = {}) => {
  if (v === undefined) return undefined
  const indent = params.indent === 'tab' ? '\t' : Number(params.indent ?? 2) || 0
  let out
  try {
    out = JSON.stringify(v, isOn(params.sortKeys) ? sortReplacer : null, indent)
  } catch (e) {
    return `Error: ${e.message}`
  }
  if (out === undefined) return undefined
  if (isOn(params.ensureAscii))
    out = out.replace(/[\u007f-\uffff]/g, (c) =>
      `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
    )
  return out
}

export const OUTPUT_NODES = {
  iot_rule: {
    id: 'iot_rule',
    label: 'IoT Rule Output',
    description: 'vendor + rtu_types + field_mappings → rule JSON',
    component: IotRuleNode,
    fields: [
      { key: 'vendor', type: 'string', default: 'crestsensors', editable: true },
      { key: 'rtu_types', type: 'array', default: ['meetput'] },
      { key: 'field_mappings', type: 'object', default: {} },
    ],
  },
  to_json: {
    id: 'to_json',
    label: 'To JSON',
    description: 'any input → formatted JSON string',
    component: ToJsonNode,
    fields: [{ key: 'value', type: 'any', default: undefined }],
    defaultParams: { indent: '2', sortKeys: false, ensureAscii: false },
    project: (fv) => toJsonValue(fv?.value),
    serialize: (fv, params) => toJsonString(toJsonValue(fv?.value), params),
  },
}

export const OUTPUT_NODE_LIST = Object.values(OUTPUT_NODES)

export default OUTPUT_NODES
