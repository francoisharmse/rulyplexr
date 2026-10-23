export default {
  id: 'rsrq_to_dbm',
  label: 'RSRQ → dBm',
  description: 'RSRQ index → dB',
  apply: (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return null
    if (n < 0) return n // already dB
    if (n <= 34) return n / 2 - 19.5
    return v
  },
}
