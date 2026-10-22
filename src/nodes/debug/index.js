export const DEBUG_NODES = {
  debug_out: {
    id: 'debug_out',
    label: 'DEBUG Output',
    description: 'Dumps the raw value of whatever feeds into it',
    fields: [{ key: 'value', type: 'any', default: undefined }],
    debug: true,
  },
}

export const DEBUG_NODE_LIST = Object.values(DEBUG_NODES)

export default DEBUG_NODES
