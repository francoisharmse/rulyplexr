export default {
  id: 'array_element',
  label: 'Array element',
  description: 'Send element N of an array (0-based index)',
  params: [{ key: 'index', label: 'index', default: '0' }],
  apply: (v, params = {}) => {
    if (!Array.isArray(v)) return null
    const i = Number(params.index ?? 0)
    if (!Number.isInteger(i) || i < 0 || i >= v.length) return null
    return v[i] ?? null
  },
}
