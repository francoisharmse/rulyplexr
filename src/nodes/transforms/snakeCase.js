import { toWords, recase } from './caseUtils.js'

const toSnake = (s) => toWords(s).map((w) => w.toLowerCase()).join('_')

export default {
  id: 'snake_case',
  label: 'Snake case',
  description: 'camelCase / kebab / spaces → snake_case',
  apply: (v) => recase(v, toSnake),
}
