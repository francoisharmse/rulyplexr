import IotRuleNode from './IotRuleNode.jsx'
import ToJsonNode from './ToJsonNode.jsx'
import ToCsvNode from './ToCsvNode.jsx'
import { isOn } from '../utils.jsx'

const sortReplacer = (key, val) =>
  val !== null && typeof val === 'object' && !Array.isArray(val)
    ? Object.fromEntries(Object.keys(val).sort().map((k) => [k, val[k]]))
    : val

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

const CSV_DELIMITERS = { comma: ',', semicolon: ';', tab: '\t', pipe: '|' }

export const toCsvString = (v, params = {}) => {
  if (v === undefined || v === null) return undefined
  if (!Array.isArray(v)) return 'Error: input must be an array'
  const rows = v
  if (!rows.length) return ''
  const delim = CSV_DELIMITERS[params.delimiter] ?? ','
  const eol = params.lineEnding === 'CRLF' ? '\r\n' : '\n'
  const quoteAll = isOn(params.quoteAll)
  const esc = (cell) => {
    const s = cell == null ? '' : typeof cell === 'object' ? JSON.stringify(cell) : String(cell)
    return quoteAll || s.includes(delim) || /["\r\n]/.test(s)
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const allObjects = rows.every((r) => r !== null && typeof r === 'object' && !Array.isArray(r))
  if (!allObjects) return rows.map(esc).join(eol)
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const lines = isOn(params.includeHeader ?? true) ? [cols.map(esc).join(delim)] : []
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(delim))
  return lines.join(eol)
}

const withDefaults = (def) => ({
  ...def,
  defaultParams: Object.fromEntries((def.params ?? []).map((p) => [p.key, p.default])),
})

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
  to_json: withDefaults({
    id: 'to_json',
    label: 'To JSON',
    description: 'any input → JSON structure, formatted preview',
    component: ToJsonNode,
    fields: [{ key: 'value', type: 'any', default: undefined }],
    params: [
      {
        key: 'indent',
        label: 'Indent',
        type: 'select',
        default: '2',
        options: [
          ...['0', '1', '2', '4', '8'].map((o) => ({
            value: o,
            label: `${o} space${o === '1' ? '' : 's'}`,
          })),
          { value: 'tab', label: 'tab' },
        ],
      },
      { key: 'sortKeys', label: 'Sort keys', type: 'boolean', default: false },
      { key: 'ensureAscii', label: 'Escape non-ASCII', type: 'boolean', default: false },
    ],
    project: (fv) => toJsonValue(fv?.value),
    serialize: (fv, params) => toJsonString(toJsonValue(fv?.value), params),
  }),
  to_csv: withDefaults({
    id: 'to_csv',
    label: 'To CSV',
    description: 'array input → CSV text',
    component: ToCsvNode,
    fields: [{ key: 'value', type: 'array', default: undefined }],
    params: [
      {
        key: 'delimiter',
        label: 'Delimiter',
        type: 'select',
        default: 'comma',
        options: [
          { value: 'comma', label: 'comma (,)' },
          { value: 'semicolon', label: 'semicolon (;)' },
          { value: 'tab', label: 'tab' },
          { value: 'pipe', label: 'pipe (|)' },
        ],
      },
      {
        key: 'lineEnding',
        label: 'Line ending',
        type: 'select',
        default: 'LF',
        options: [
          { value: 'LF', label: 'LF (Unix)' },
          { value: 'CRLF', label: 'CRLF (Windows)' },
        ],
      },
      { key: 'includeHeader', label: 'Header row', type: 'boolean', default: true },
      { key: 'quoteAll', label: 'Quote all fields', type: 'boolean', default: false },
    ],
    project: (fv, params) => toCsvString(fv?.value, params),
    serialize: (fv, params) => toCsvString(fv?.value, params),
  }),
}

export const OUTPUT_NODE_LIST = Object.values(OUTPUT_NODES)

export default OUTPUT_NODES
