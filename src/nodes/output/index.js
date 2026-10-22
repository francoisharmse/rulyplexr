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
}

export const OUTPUT_NODE_LIST = Object.values(OUTPUT_NODES)

export default OUTPUT_NODES
