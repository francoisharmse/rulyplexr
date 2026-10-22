import { toWords, recase } from './caseUtils.js'

const toPascal = (s) =>
  toWords(s)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('')

export default {
  id: 'pascal_case',
  label: 'Pascal case',
  description: 'snake_case / kebab / spaces → PascalCase',
  apply: (v) => recase(v, toPascal),
}
