import { parse, parseTree, printParseErrorCode } from 'jsonc-parser'

const humanize = (code) => {
  const spaced = code.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function validateJson(text) {
  const lines = text.split('\n')
  const toLoc = (offset) => {
    let remaining = offset
    for (let i = 0; i < lines.length; i++) {
      if (remaining <= lines[i].length) return { line: i + 1, column: remaining + 1 }
      remaining -= lines[i].length + 1
    }
    return { line: lines.length, column: lines[lines.length - 1].length + 1 }
  }
  const at = (offset) => ({ ...toLoc(offset), snippet: lines[toLoc(offset).line - 1] ?? '' })

  if (!text.trim()) {
    return { ok: false, errors: [{ message: 'Empty input', ...at(0) }], warnings: [] }
  }

  const rawErrors = []
  const value = parse(text, rawErrors, {
    disallowComments: true,
    allowTrailingComma: false,
    allowEmptyContent: false,
  })
  const errors = rawErrors.map(({ error, offset }) => ({
    message: humanize(printParseErrorCode(error)),
    ...at(offset),
  }))

  const warnings = []
  const visit = (node) => {
    if (node.type === 'object') {
      const seen = new Set()
      for (const prop of node.children ?? []) {
        const keyNode = prop.children?.[0]
        if (!keyNode) continue
        if (seen.has(keyNode.value)) {
          warnings.push({
            message: `Duplicate key "${keyNode.value}" — the later value overwrites the earlier one`,
            ...at(keyNode.offset),
          })
        }
        seen.add(keyNode.value)
      }
    } else if (node.type === 'number') {
      const raw = text.slice(node.offset, node.offset + node.length)
      if (/^[+-]?\d+$/.test(raw) && !Number.isSafeInteger(node.value)) {
        warnings.push({
          message: `Integer ${raw} exceeds JS's safe range — it silently loses precision (consider a string)`,
          ...at(node.offset),
        })
      }
    }
    for (const child of node.children ?? []) visit(child)
  }
  const tree = parseTree(text)
  if (tree) visit(tree)

  return {
    ok: errors.length === 0,
    value: errors.length === 0 ? value : undefined,
    errors,
    warnings,
  }
}
