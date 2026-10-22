export default {
  id: 'unix_to_date',
  label: 'Transform to date',
  description: 'Unix seconds → YYYY-MM-DD',
  apply: (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? new Date(n * 1000).toISOString().slice(0, 10) : null
  },
}
