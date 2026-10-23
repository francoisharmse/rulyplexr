export default {
  id: 'unix_to_human',
  label: 'Transform to readable time',
  description: 'Unix seconds → "27 Aug 2026, 07:14"',
  apply: (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return null
    return new Date(n * 1000).toUTCString().replace(' GMT', '')
  },
}
