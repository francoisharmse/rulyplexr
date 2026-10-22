import { mapStrings } from './caseUtils.js'

export default {
  id: 'to_upper_case',
  label: 'To upper case',
  description: 'lower / Mixed → UPPER case',
  apply: (v) => mapStrings(v, (s) => s.toUpperCase()),
}
