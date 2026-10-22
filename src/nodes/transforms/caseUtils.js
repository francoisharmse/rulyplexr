export const toWords = (s) =>
  String(s)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)

export const recase = (v, toCase, inObject = false) => {
  if (typeof v === 'string') return inObject ? v : toCase(v)
  if (Array.isArray(v)) return v.map((x) => recase(x, toCase, inObject))
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [toCase(k), recase(x, toCase, true)]),
    )
  return v
}

export const mapStrings = (v, f) => {
  if (typeof v === 'string') return f(v)
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, f))
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [f(k), mapStrings(x, f)]),
    )
  return v
}
