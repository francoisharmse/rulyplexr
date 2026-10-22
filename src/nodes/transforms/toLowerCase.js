import { mapStrings } from './caseUtils.js'

export default {
  id: 'to_lower_case',
  label: 'To lower case',
  description: 'UPPER / Mixed → lower case',
  apply: (v) => mapStrings(v, (s) => s.toLowerCase()),
}
