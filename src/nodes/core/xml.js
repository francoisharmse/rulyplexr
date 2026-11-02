const xmlScalar = (s) => {
  const t = String(s ?? '').trim()
  if (!t) return ''
  if (t === 'true') return true
  if (t === 'false') return false
  const n = Number(t)
  return Number.isNaN(n) ? s : n
}

export const parseXmlToObj = (text) => {
  try {
    const doc = new DOMParser().parseFromString(text, 'text/xml')
    if (doc.querySelector('parsererror')) return null
    const el2obj = (el) => {
      const out = {}
      for (const a of el.attributes ?? []) out[`@${a.name}`] = xmlScalar(a.value)
      const kids = [...el.children]
      if (!kids.length) {
        const t = el.textContent ?? ''
        return Object.keys(out).length
          ? t.trim()
            ? { ...out, '#text': xmlScalar(t) }
            : out
          : xmlScalar(t)
      }
      const t = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent)
        .join('')
        .trim()
      if (t) out['#text'] = xmlScalar(t)
      for (const c of kids) {
        const v = el2obj(c)
        if (c.tagName in out) {
          if (!Array.isArray(out[c.tagName])) out[c.tagName] = [out[c.tagName]]
          out[c.tagName].push(v)
        } else out[c.tagName] = v
      }
      return out
    }
    return { [doc.documentElement.tagName]: el2obj(doc.documentElement) }
  } catch {
    return null
  }
}
