// Core node plugins — structural nodes bound to the shared output-structure
// JSON. Dropped onto the canvas from the "Core Nodes" palette section.
//
//   export default {
//     id: 'unique_id',      // required — stable key used on canvas nodes
//     label: 'Palette label',
//     description: 'short hint',
//     nodeType: 'mapperV1', // required — React Flow node type + renderer
//   }
import JsonNode from './JsonNode.jsx'
import MapperV2Node from './MapperV2Node.jsx'

export const CORE_NODES = {
  input_json: {
    id: 'input_json',
    label: 'Input JSON',
    description: 'Render the input JSON payload as a wireable node',
    nodeType: 'inputJson',
    component: JsonNode,
  },
  json_mapper: {
    id: 'json_mapper',
    label: 'JSON Mapper',
    description: 'Map input fields into the output JSON structure',
    nodeType: 'mapperV1',
    component: JsonNode,
    mapper: true,
  },
  json_mapper_v2: {
    id: 'json_mapper_v2',
    label: 'JSON Mapper v2',
    description: 'Mapper + typed field/unit editor, JSON descriptor output',
    nodeType: 'mapperV2',
    component: MapperV2Node,
    mapper: true,
  },
}

export const CORE_NODE_LIST = Object.values(CORE_NODES)

export const MAPPER_TYPES = new Set(
  CORE_NODE_LIST.filter((n) => n.mapper).map((n) => n.nodeType),
)

export default CORE_NODES
