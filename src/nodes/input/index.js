import StringFieldNode from './StringFieldNode.jsx'
import NumberFieldNode from './NumberFieldNode.jsx'
import BooleanFieldNode from './BooleanFieldNode.jsx'
import ArrayFieldNode from './ArrayFieldNode.jsx'

const toOutString = (v) =>
  v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)

const toNumber = (v) => {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}

const toBoolean = (v) => {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string')
    return !['', '0', 'false', 'no', 'off'].includes(v.trim().toLowerCase())
  return v != null
}

const toArray = (v) => {
  if (Array.isArray(v)) return v
  return v == null || v === '' ? [] : [v]
}

const parseArrayText = (text) => {
  const t = (text ?? '').trim()
  if (!t) return []
  try {
    const v = JSON.parse(t)
    return Array.isArray(v) ? v : [v]
  } catch {
    return undefined
  }
}

const parseItem = (t) => {
  const s = (t ?? '').trim()
  if (!s) return ''
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

export const INPUT_NODES = {
  string_field: {
    id: 'string_field',
    label: 'String field',
    description: 'Literal text or any input → raw string out',
    type: 'string',
    editor: StringFieldNode,
    defaultParams: { value: '' },
    parse: (p) => p?.value ?? '',
    coerce: toOutString,
  },
  number_field: {
    id: 'number_field',
    label: 'Number field',
    description: 'Numeric literal or any input → number out',
    type: 'number',
    editor: NumberFieldNode,
    defaultParams: { value: '' },
    parse: (p) => toNumber(p?.value),
    coerce: toNumber,
  },
  boolean_field: {
    id: 'boolean_field',
    label: 'Boolean field',
    description: 'Toggle or any input → true/false out',
    type: 'boolean',
    editor: BooleanFieldNode,
    defaultParams: { value: false },
    parse: (p) => !!p?.value,
    coerce: toBoolean,
  },
  array_field: {
    id: 'array_field',
    label: 'Array field',
    description: 'One field per item (any value) → array out',
    type: 'array',
    editor: ArrayFieldNode,
    defaultParams: { value: [''] },
    parse: (p) =>
      Array.isArray(p?.value) ? p.value.map(parseItem) : parseArrayText(p?.value),
    coerce: toArray,
  },
}

export const INPUT_NODE_LIST = Object.values(INPUT_NODES)

export default INPUT_NODES
