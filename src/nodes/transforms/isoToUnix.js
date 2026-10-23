export default {
  id: 'iso_to_unix',
  label: 'Transform ISO to Unix time',
  description: 'ISO 8601 → Unix seconds',
  apply: (v) => {
    const t = Date.parse(String(v))
    return Number.isFinite(t) ? Math.floor(t / 1000) : null
  },
}
