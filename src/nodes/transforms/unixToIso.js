export default {
  id: 'unix_to_iso',
  label: 'Transform to ISO time',
  description: 'Unix seconds → ISO 8601',
  apply: (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? new Date(n * 1000).toISOString() : null
  },
}
