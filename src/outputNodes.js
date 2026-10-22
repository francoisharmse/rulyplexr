export const OUTPUT_NODES = {
  iot_rule: {
    id: 'iot_rule',
    label: 'IoT Rule Output',
    description: 'vendor + rtu_types + field_mappings → rule JSON',
    fields: [
      { key: 'vendor', type: 'string', default: 'crestsensors', editable: true },
      { key: 'rtu_types', type: 'array', default: ['meetput'] },
      { key: 'field_mappings', type: 'object', default: {} },
    ],
  },
  debug_out: {
    id: 'debug_out',
    label: 'DEBUG Output',
    description: 'Dumps the raw value of whatever feeds into it',
    fields: [{ key: 'value', type: 'any', default: undefined }],
    debug: true,
  },
}

export const OUTPUT_NODE_LIST = Object.values(OUTPUT_NODES).filter((o) => !o.debug)
export const DEBUG_NODE_LIST = Object.values(OUTPUT_NODES).filter((o) => o.debug)

export default OUTPUT_NODES
