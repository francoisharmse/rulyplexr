export default {
  id: 'combine',
  label: 'Combine fields',
  description: 'Join multiple inputs · optional separator',
  multiInput: true,
  params: [{ key: 'separator', label: 'separator', default: '' }],
  apply: (values, params = {}) =>
    values
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .filter((v) => v != null && v !== '' && typeof v !== 'object')
      .join(params.separator ?? ''),
}
