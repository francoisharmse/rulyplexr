export default {
  id: 'csq_to_dbm',
  label: 'CSQ → dBm',
  description: 'CSQ index → dBm',
  apply: (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return null
    if (n === 99) return null // not known or not detectable
    if (n < 0) return n // already dBm
    if (n <= 31) return n * 2 - 113
    return v
  },
}
