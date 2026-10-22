export default {
  id: 'unix_ms_to_iso',
  label: 'Transform ms to ISO time',
  description: 'Unix milliseconds → ISO 8601',
  apply: (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? new Date(n).toISOString() : null
  },
}
