const parseItem = (t) => {
  const s = (t ?? '').trim()
  if (!s) return ''
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

const toText = (v) =>
  v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)

export default {
  id: 'split_to_array',
  label: 'Split to array',
  description: 'Split input on a separator → array out',
  params: [{ key: 'separator', label: 'separator', default: ',' }],
  apply: (v, params = {}) => {
    if (Array.isArray(v)) return v
    const s = toText(v).trim()
    if (!s) return []
    const sep = params.separator ?? ''
    return sep === '' ? [parseItem(s)] : s.split(sep).map(parseItem)
  },
}
