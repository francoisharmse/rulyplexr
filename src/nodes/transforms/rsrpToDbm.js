export default {
  id: 'rsrp_to_dbm',
  label: 'RSRP → dBm',
  description: 'RSRP index → dBm',
  apply: (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return null
    if (n < 0) return n // already dBm
    if (n <= 97) return n - 141
    return v
  },
}
