import { toWords, recase } from './caseUtils.js'

const toCamel = (s) =>
  toWords(s)
    .map((w, i) => {
      const lower = w.toLowerCase()
      return i === 0 ? lower : lower[0].toUpperCase() + lower.slice(1)
    })
    .join('')

export default {
  id: 'camel_case',
  label: 'Camel case',
  description: 'snake_case / kebab / spaces → camelCase',
  apply: (v) => recase(v, toCamel),
}
