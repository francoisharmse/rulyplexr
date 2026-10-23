export default {
  id: 'unix_to_local',
  label: 'Transform to local time',
  description: 'Unix seconds → local date & time',
  apply: (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return null
    const d = new Date(n * 1000)
    const p = (x) => String(x).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  },
}
