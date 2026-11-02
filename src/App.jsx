import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  reconnectEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useUpdateNodeInternals,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AbcIcon from '@mui/icons-material/Abc'
import NumbersIcon from '@mui/icons-material/Numbers'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import DataArrayIcon from '@mui/icons-material/DataArray'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import DataObjectIcon from '@mui/icons-material/DataObject'
import BugReportIcon from '@mui/icons-material/BugReport'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import SaveIcon from '@mui/icons-material/Save'
import SaveAsIcon from '@mui/icons-material/SaveAs'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import JsonNode, { toEntries, toRows, typeOf, isField } from './nodes/core/JsonNode.jsx'
import MapperV2Node from './nodes/core/MapperV2Node.jsx'
import TransformNode from './nodes/transforms/TransformNode.jsx'
import RuleOutputNode from './nodes/output/RuleOutputNode.jsx'
import DebugNode from './nodes/debug/DebugNode.jsx'
import InputNode from './nodes/input/InputNode.jsx'
import { validateJson } from './validateJson.js'
import sampleInputText from '../sample_json.json?raw'
import sampleOutputText from '../sample_output.json?raw'

import TRANSFORMS, { TRANSFORM_LIST } from './nodes/transforms/index.js'
import OUTPUT_NODES, { OUTPUT_NODE_LIST } from './nodes/output/index.js'
import DEBUG_NODES, { DEBUG_NODE_LIST } from './nodes/debug/index.js'
import INPUT_NODES, { INPUT_NODE_LIST } from './nodes/input/index.js'
import CORE_NODES, { CORE_NODE_LIST, MAPPER_TYPES } from './nodes/core/index.js'

const NODE_DEFS = { ...OUTPUT_NODES, ...DEBUG_NODES }

const nodeTypes = {
  jsonNode: JsonNode,
  inputJson: JsonNode,
  transform: TransformNode,
  ruleOutput: RuleOutputNode,
  debugNode: DebugNode,
  stringInput: InputNode,
  mapperV1: JsonNode,
  mapperV2: MapperV2Node,
}

const NODE_WIDTH = { jsonNode: 360, transform: 200, ruleOutput: 260, debugNode: 260, stringInput: 220, mapperV1: 360, mapperV2: 360, inputJson: 360 }

const stripEmptySource = (v) => {
  if (Array.isArray(v)) return v.map(stripEmptySource)
  if (v !== null && typeof v === 'object') {
    const out = {}
    for (const [k, x] of Object.entries(v))
      if (!(k === 'source' && typeof x === 'string' && !x.trim()))
        out[k] = stripEmptySource(x)
    return out
  }
  return v
}

const JSON_TYPE_NAMES = new Set(['string', 'number', 'boolean', 'array', 'object', 'null'])
const capFieldType = (t) => t[0].toUpperCase() + t.slice(1)

const projectMapperFields = (tmpl, path, resolveLeaf) => {
  if (Array.isArray(tmpl))
    return tmpl.map((el, i) =>
      projectMapperFields(el, path ? `${path}.${i}` : String(i), resolveLeaf),
    )
  if (tmpl !== null && typeof tmpl === 'object') {
    if (isField(tmpl)) {
      const rv = resolveLeaf?.(path)
      const ft = JSON_TYPE_NAMES.has(tmpl.type)
        ? tmpl.type
        : rv !== undefined
          ? typeOf(rv)
          : 'string'
      const projected = { ...tmpl, Field_Type: capFieldType(ft), Unit: tmpl.unit ?? '' }
      delete projected.source
      return projected
    }
    return Object.fromEntries(
      Object.entries(tmpl).map(([k, x]) => [
        k,
        projectMapperFields(x, path ? `${path}.${k}` : k, resolveLeaf),
      ]),
    )
  }
  return tmpl
}

const INPUT_TYPE_ICONS = {
  string: AbcIcon,
  number: NumbersIcon,
  boolean: ToggleOnIcon,
  array: DataArrayIcon,
}

const TEXT_KEY = 'json-node-texts-v1'
const GRAPH_KEY = 'json-node-graph-v1'

const hashStr = (s) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return h.toString(36)
}

const loadSavedGraph = (sig) => {
  try {
    const g = JSON.parse(localStorage.getItem(GRAPH_KEY))
    if (g?.v === 1 && g.sig === sig) return g
  } catch {}
  return null
}

function collectSources(node, path = '') {
  const out = []
  if (node !== null && typeof node === 'object') {
    if (typeof node.source === 'string') out.push({ source: node.source, path })
    const entries = Array.isArray(node) ? node.map((v, i) => [String(i), v]) : Object.entries(node)
    for (const [k, v] of entries) out.push(...collectSources(v, path ? `${path}.${k}` : k))
  }
  return out
}

const EDGE_STYLE = { stroke: '#9d92ff', strokeWidth: 1.5 }
const EDGE_HI_STYLE = { stroke: '#e6e2ff', strokeWidth: 2.5 }
const EDGE_DIM_STYLE = { stroke: '#9d92ff', strokeWidth: 1.5, opacity: 0.2 }
const EDGE_SELECTED_STYLE = { stroke: '#ffffff', strokeWidth: 3.5 }
const EDGE_DROP_STYLE = { stroke: '#ffffff', strokeWidth: 3 }

function Canvas({ jsonData, outputData, sig, onBrowseFile, onPasteJson, onBrowseOutput, onPasteOutput, onUpdateOutput, onBrowseNodeInput, onPasteNodeInput, apiRef }) {
  const restoredRef = useRef()
  const lastBuildRef = useRef(null)
  const didInitFitRef = useRef(false)
  if (restoredRef.current === undefined) restoredRef.current = loadSavedGraph(sig)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [pendingSource, setPendingSource] = useState(null)
  const [sel, setSel] = useState(null)
  const [dropEdgeId, setDropEdgeId] = useState(null)
  const [restoreTick, setRestoreTick] = useState(0)
  const [collapsed, setCollapsed] = useState({})
  const [nodeParams, setNodeParams] = useState({})
  const txIdRef = useRef(0)
  const outIdRef = useRef(0)
  const inIdRef = useRef(0)
  const mapIdRef = useRef(0)
  const fieldsRemovedRef = useRef(false)
  const { fitView, screenToFlowPosition, getNode, getNodes } = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()

  const isMultiTarget = useCallback(
    (nodeId) => {
      const n = getNode(nodeId)
      if (n?.type === 'transform') return !!TRANSFORMS[n.data.transformId]?.multiInput
      if (n?.type === 'stringInput') return !!INPUT_NODES[n.data?.kind]?.multiInput
      return false
    },
    [getNode],
  )

  const setParam = useCallback(
    (nodeId, key, val) =>
      setNodeParams((p) => ({ ...p, [nodeId]: { ...(p[nodeId] ?? {}), [key]: val } })),
    [],
  )

  const upsertEdge = useCallback(
    (conn, eds) => {
      const filtered = isMultiTarget(conn.target)
        ? eds
        : eds.filter(
            (e) => !(e.target === conn.target && e.targetHandle === conn.targetHandle),
          )
      return addEdge({ ...conn, style: EDGE_STYLE }, filtered)
    },
    [isMultiTarget],
  )

  const onConnect = useCallback(
    (conn) => setEdges((eds) => upsertEdge(conn, eds)),
    [setEdges, upsertEdge],
  )

  const onReconnect = useCallback(
    (oldEdge, conn) =>
      setEdges((eds) => {
        const multi = isMultiTarget(conn.target)
        return reconnectEdge(oldEdge, conn, eds, { shouldReplaceId: true }).filter(
          (e) =>
            multi ||
            e.id === oldEdge.id ||
            !(e.target === conn.target && e.targetHandle === conn.targetHandle),
        )
      }),
    [setEdges, isMultiTarget],
  )

  const toggleCollapsed = useCallback((nodeId, rowId) => {
    setCollapsed((c) => {
      const s = new Set(c[nodeId] ?? [])
      if (s.has(rowId)) s.delete(rowId)
      else s.add(rowId)
      return { ...c, [nodeId]: s }
    })
  }, [])

  const onPaneClick = useCallback(() => {
    setPendingSource(null)
    setSel(null)
  }, [])

  const duplicateSelected = useCallback(() => {
    const selNodes = getNodes().filter((n) => n.selected && n.type !== 'jsonNode')
    if (!selNodes.length) return
    const created = selNodes.map((n) => {
      const prefix = /^[a-z]+/.exec(n.id)?.[0]
      const ref =
        prefix === 'out' ? outIdRef
        : prefix === 'in' ? inIdRef
        : prefix === 'map' ? mapIdRef
        : txIdRef
      return {
        ...n,
        id: `${prefix ?? 'tx'}-${++ref.current}`,
        position: { x: n.position.x + 32, y: n.position.y + 32 },
        selected: true,
        data: { ...n.data },
      }
    })
    setNodeParams((p) => {
      const q = { ...p }
      selNodes.forEach((n, i) => {
        if (p[n.id]) q[created[i].id] = { ...p[n.id] }
      })
      return q
    })
    setNodes((ns) => [
      ...ns.map((n) => (n.selected ? { ...n, selected: false } : n)),
      ...created,
    ])
  }, [getNodes, setNodes])

  const onNodeClick = useCallback(
    (_, node) => {
      if (
        pendingSource &&
        (node.type === 'stringInput' ||
          (node.type === 'transform' && TRANSFORMS[node.data.transformId]?.multiInput))
      ) {
        setEdges((eds) =>
          upsertEdge(
            {
              id: `e-${pendingSource.node}-${pendingSource.row}-${node.id}`,
              source: pendingSource.node,
              sourceHandle: `s-${pendingSource.row}`,
              target: node.id,
              targetHandle: 'in',
            },
            eds,
          ),
        )
        setPendingSource(null)
        return
      }
      setSel({ nodeId: node.id })
    },
    [pendingSource, setEdges, upsertEdge],
  )

  const makeResolver = useCallback((eds, inputObj, nodeMap, paramsMap, fieldsValue) => {
    const edgeVal = (e, depth) => {
      if (!e || depth > 12) return undefined
      const tn = nodeMap[e.source]
      if (e.source === 'json-root' || tn?.type === 'inputJson') {
        const path = e.sourceHandle?.slice(2)
        if (tn?.type === 'inputJson') {
          const feed = eds.find(
            (x) => x.target === e.source && x.targetHandle === `t-${path}`,
          )
          if (feed) return edgeVal(feed, depth + 1)
          return path
            ?.split('.')
            .reduce((o, k) => (o == null ? o : o[k]), paramsMap[e.source]?.value)
        }
        return path
          ?.split('.')
          .reduce((o, k) => (o == null ? o : o[k]), inputObj)
      }
      const mapperType =
        e.source === 'fields' ? 'mapperV1' : MAPPER_TYPES.has(tn?.type) ? tn.type : null
      if (mapperType) {
        const tmpl = e.source === 'fields' ? fieldsValue : tn?.data?.value
        const leafEdge = (p) =>
          eds.find((x) => x.target === e.source && x.targetHandle === `t-${p}`)
        if (e.sourceHandle === 's-root')
          return mapperType === 'mapperV2'
            ? projectMapperFields(tmpl, '', (p) => edgeVal(leafEdge(p), depth + 1))
            : tmpl
        const path = e.sourceHandle?.slice(2)
        const direct = leafEdge(path)
        if (direct) return edgeVal(direct, depth + 1)
        const subtree = path
          ?.split('.')
          .reduce((o, k) => (o == null ? o : o[k]), tmpl)
        const rebuild = (t, p) => {
          if (t === null || typeof t !== 'object') return t
          if (Array.isArray(t))
            return t.map((el, i) => rebuild(el, p ? `${p}.${i}` : String(i)))
          if (isField(t) && t.type !== 'object' && t.type !== 'array') {
            if (mapperType === 'mapperV2') {
              const out = { ...t }
              delete out.source
              return out
            }
            const r = edgeVal(leafEdge(p), depth + 1)
            return { ...t, source: r !== undefined ? r : t.source }
          }
          return Object.fromEntries(
            Object.entries(t).map(([k, v]) => [k, rebuild(v, p ? `${p}.${k}` : k)]),
          )
        }
        return subtree === undefined ? undefined : rebuild(subtree, path)
      }
      if (!tn) return undefined
      if (tn.type === 'ruleOutput' || tn.type === 'debugNode') {
        const odef = NODE_DEFS[tn.data.kind]
        if (!odef) return undefined
        const params = paramsMap[tn.id] ?? {}
        const obj = {}
        for (const f of odef.fields) {
          const v = edgeVal(
            eds.find((x) => x.target === tn.id && x.targetHandle === `t-${f.key}`),
            depth + 1,
          )
          obj[f.key] = v === undefined ? (params[f.key] ?? f.default) : v
        }
        return odef.project ? odef.project(obj, params) : obj
      }
      if (tn.type === 'stringInput') {
        const def = INPUT_NODES[tn.data.kind] ?? INPUT_NODES.string_field
        const ins = eds.filter((x) => x.target === tn.id)
        if (!ins.length) return def.parse(paramsMap[tn.id])
        if (def.multiInput) {
          const vals = ins.map((x) => edgeVal(x, depth + 1))
          return def.merge?.(vals, paramsMap[tn.id]) ?? vals
        }
        return def.coerce(edgeVal(ins[0], depth + 1), paramsMap[tn.id])
      }
      const def = TRANSFORMS[tn.data.transformId]
      if (!def) return undefined
      const ins = eds.filter((x) => x.target === tn.id)
      if (def.multiInput) {
        return def.apply(
          ins.map((x) => edgeVal(x, depth + 1)),
          paramsMap[tn.id],
        )
      }
      return def.apply(edgeVal(ins[0], depth + 1), paramsMap[tn.id])
    }
    return {
      edgeVal,
      at: (target, targetHandle) =>
        edgeVal(
          eds.find((e) => e.target === target && e.targetHandle === targetHandle),
          0,
        ),
    }
  }, [])

  const acceptsConnection = useCallback(
    (conn) => {
      const tNode = conn.target === 'fields' ? null : getNode(conn.target)
      const def =
        tNode?.type === 'ruleOutput' || tNode?.type === 'debugNode'
          ? NODE_DEFS[tNode.data?.kind]
          : null
      const want = def?.fields?.find((f) => `t-${f.key}` === conn.targetHandle)
        ?.type
      if (!want || want === 'any' || !conn.source) return true
      let src = 'any'
      const sNode = getNode(conn.source)
      if (
        conn.source === 'json-root' ||
        conn.source === 'fields' ||
        sNode?.type === 'inputJson'
      ) {
        const root =
          conn.source === 'fields'
            ? outputData
            : sNode?.type === 'inputJson'
              ? nodeParams[conn.source]?.value
              : jsonData?.value
        const path =
          conn.sourceHandle === 's-root' ? '' : conn.sourceHandle?.slice(2)
        const v = path
          ? path.split('.').reduce((o, k) => (o == null ? o : o[k]), root)
          : root
        if (isField(v)) src = v.type
        else if (v !== undefined && typeof v?.source !== 'string') src = typeOf(v)
      } else if (sNode?.type === 'stringInput') {
        src = INPUT_NODES[sNode.data?.kind]?.type ?? 'any'
      }
      return src === 'any' || src === want
    },
    [getNode, jsonData, outputData, nodeParams],
  )

  const handleRowClick = useCallback(
    (nodeId, rowId) => {
      const srcNode = getNode(nodeId)
      if (nodeId === 'json-root' || srcNode?.type === 'inputJson') {
        setPendingSource((p) =>
          p?.node === nodeId && p?.row === rowId
            ? null
            : { node: nodeId, row: rowId },
        )
        setSel((s) =>
          s?.nodeId === nodeId && s.rowId === rowId ? null : { nodeId, rowId },
        )
      } else {
        if (pendingSource) {
          const conn = {
            id: `e-${pendingSource.node}-${pendingSource.row}-${rowId}`,
            source: pendingSource.node,
            sourceHandle: `s-${pendingSource.row}`,
            target: nodeId,
            targetHandle: `t-${rowId}`,
          }
          if (acceptsConnection(conn)) {
            setEdges((eds) => upsertEdge(conn, eds))
            setPendingSource(null)
          }
        }
        setSel((s) =>
          s?.nodeId === nodeId && s.rowId === rowId ? null : { nodeId, rowId },
        )
      }
    },
    [pendingSource, setEdges, upsertEdge, acceptsConnection, getNode],
  )

  const insertTransform = useCallback(
    (type, edge, pos) => {
      const t = TRANSFORMS[type]
      if (!t) return
      const tId = `tx-${++txIdRef.current}`
      setNodes((ns) => [
        ...ns,
        {
          id: tId,
          type: 'transform',
          position: { x: pos.x - 100, y: pos.y - 20 },
          width: NODE_WIDTH.transform,
          data: { label: t.label, transformId: type },
        },
      ])
      if (t.params?.length) {
        setNodeParams((p) => ({
          ...p,
          [tId]: Object.fromEntries(t.params.map((x) => [x.key, x.default ?? ''])),
        }))
      }
      if (edge) {
        setEdges((eds) => [
          ...eds.filter((e) => e.id !== edge.id),
          {
            id: `e-${edge.sourceHandle?.slice(2)}-${tId}`,
            source: edge.source,
            sourceHandle: edge.sourceHandle,
            target: tId,
            targetHandle: 'in',
            style: EDGE_STYLE,
          },
          {
            id: `e-${tId}-${edge.targetHandle?.slice(2)}`,
            source: tId,
            sourceHandle: 'out',
            target: edge.target,
            targetHandle: edge.targetHandle,
            style: EDGE_STYLE,
          },
        ])
      }
    },
    [setNodes, setEdges],
  )

  const insertOutputNode = useCallback(
    (kind, pos) => {
      const def = NODE_DEFS[kind]
      if (!def) return
      const nodeType = DEBUG_NODES[kind] ? 'debugNode' : 'ruleOutput'
      const oId = `out-${++outIdRef.current}`
      setNodes((ns) => [
        ...ns,
        {
          id: oId,
          type: nodeType,
          position: { x: pos.x - 130, y: pos.y - 40 },
          width: NODE_WIDTH[nodeType],
          data: { kind, label: def.label },
        },
      ])
      if (def.defaultParams)
        setNodeParams((p) => ({ ...p, [oId]: { ...def.defaultParams } }))
    },
    [setNodes],
  )

  const insertInputNode = useCallback(
    (kind, pos) => {
      const def = INPUT_NODES[kind]
      if (!def) return
      const iId = `in-${++inIdRef.current}`
      setNodes((ns) => [
        ...ns,
        {
          id: iId,
          type: 'stringInput',
          position: { x: pos.x - 110, y: pos.y - 30 },
          width: NODE_WIDTH.stringInput,
          data: { kind, label: def.label },
        },
      ])
      setNodeParams((p) => ({
        ...p,
        [iId]: Object.fromEntries(
          Object.entries(def.defaultParams ?? {}).map(([k, v]) => [
            k,
            Array.isArray(v) ? [...v] : v,
          ]),
        ),
      }))
    },
    [setNodes],
  )

  const insertCoreNode = useCallback(
    (kind, pos) => {
      const def = CORE_NODES[kind]
      if (!def) return
      const mId = `map-${++mapIdRef.current}`
      setNodes((ns) => [
        ...ns,
        {
          id: mId,
          type: def.nodeType,
          position: { x: pos.x - 180, y: pos.y - 40 },
          width: NODE_WIDTH[def.nodeType],
          data: {
            kind,
            label: def.label,
            name: def.label.toUpperCase(),
            value:
              def.nodeType === 'inputJson' ? {} : (outputData ?? {}),
            subName: def.nodeType === 'inputJson' ? jsonData?.name : undefined,
            rootHandle: def.nodeType !== 'inputJson',
          },
        },
      ])
      if (def.nodeType !== 'inputJson' && outputData) {
        const live = getNodes()
        const newEdges = []
        for (const s of live.filter(
          (n) => n.id === 'json-root' || n.type === 'inputJson',
        )) {
          const srcVal =
            s.id === 'json-root' ? jsonData?.value : nodeParams[s.id]?.value
          if (!srcVal) continue
          const keys = new Set(toEntries(srcVal).map(([k]) => k))
          for (const m of collectSources(outputData).filter((m) =>
            keys.has(m.source),
          ))
            newEdges.push({
              id: `e-${s.id}-${m.source}-${mId}-${m.path}`,
              source: s.id,
              sourceHandle: `s-${m.source}`,
              target: mId,
              targetHandle: `t-${m.path}`,
              reconnectable: true,
              style: EDGE_STYLE,
            })
        }
        if (newEdges.length) setEdges((eds) => [...eds, ...newEdges])
      }
    },
    [setNodes, setEdges, jsonData, outputData, getNodes, nodeParams],
  )

  const onBeforeDelete = useCallback(
    ({ nodes: dNodes }) => {
      if (dNodes.some((n) => n.id === 'fields')) fieldsRemovedRef.current = true
      if (!dNodes.some((n) => n.type !== 'jsonNode')) return true
      setEdges((eds) => {
        let next = eds
        for (const n of dNodes.filter((n) => n.type !== 'jsonNode')) {
          const inEs = next.filter((e) => e.target === n.id)
          const outEs = next.filter((e) => e.source === n.id)
          next = next.filter((e) => !inEs.includes(e) && !outEs.includes(e))
          if (n.type !== 'ruleOutput' && n.type !== 'debugNode' && !MAPPER_TYPES.has(n.type) && inEs.length === 1) {
            for (const outE of outEs) {
              next = addEdge(
                {
                  id: `e-${inEs[0].sourceHandle?.slice(2)}-${outE.targetHandle?.slice(2)}`,
                  source: inEs[0].source,
                  sourceHandle: inEs[0].sourceHandle,
                  target: outE.target,
                  targetHandle: outE.targetHandle,
                  style: EDGE_STYLE,
                },
                next,
              )
            }
          }
        }
        return next
      })
      setNodeParams((p) => {
        const q = { ...p }
        for (const n of dNodes) delete q[n.id]
        return q
      })
      setNodes((ns) => ns.filter((n) => !dNodes.some((d) => d.id === n.id)))
      return false
    },
    [setNodes, setEdges],
  )

  const edgeAtPoint = (e) =>
    document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest?.('.react-flow__edge')
      ?.getAttribute('data-id') ?? null

  const onDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropEdgeId(edgeAtPoint(e))
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDropEdgeId(null)
    const type = e.dataTransfer.getData('application/x-transform-node')
    const outType = e.dataTransfer.getData('application/x-output-node')
    const inType = e.dataTransfer.getData('application/x-input-node')
    const coreType = e.dataTransfer.getData('application/x-core-node')
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    if (coreType) {
      insertCoreNode(coreType, pos)
      return
    }
    if (outType) {
      insertOutputNode(outType, pos)
      return
    }
    if (inType) {
      insertInputNode(inType, pos)
      return
    }
    if (!type) return
    const edge = edges.find((x) => x.id === edgeAtPoint(e))
    insertTransform(type, edge, pos)
  }

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
        if (['TEXTAREA', 'INPUT'].includes(e.target?.tagName) || e.target?.isContentEditable)
          return
        e.preventDefault()
        duplicateSelected()
        return
      }
      if (e.key === 'Escape') {
        setPendingSource(null)
        setSel(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [duplicateSelected])

  useEffect(() => {
    if (
      lastBuildRef.current?.jsonData === jsonData &&
      lastBuildRef.current?.outputData === outputData
    )
      return
    lastBuildRef.current = { jsonData, outputData }
    if (restoredRef.current?.fieldsRemoved) fieldsRemovedRef.current = true
    const nodes = fieldsRemovedRef.current
      ? []
      : [
          {
            id: 'fields',
            type: 'jsonNode',
            position: { x: 620, y: 60 },
            width: NODE_WIDTH.jsonNode,
            data: { name: 'JSON MAPPER', value: outputData ?? {}, rootHandle: true },
          },
        ]
    const edges = []
    const restored = restoredRef.current
    restoredRef.current = null
    if (restored) {
      const posMap = restored.positions ?? {}
      for (const n of nodes) if (posMap[n.id]) n.position = posMap[n.id]
      const txNodes = (restored.transforms ?? [])
        .map((t) => {
          const type = DEBUG_NODES[t.data?.kind]
            ? 'debugNode'
            : (t.type ?? 'transform')
          return {
            id: t.id,
            type,
            position: t.position,
            width: t.width ?? NODE_WIDTH[type],
            data: {
              label: t.data?.label,
              transformId: t.data?.transformId,
              kind: t.data?.kind,
            },
          }
        })
        .filter((t) =>
          t.type === 'ruleOutput' || t.type === 'debugNode'
            ? !!NODE_DEFS[t.data.kind]
            : t.type === 'stringInput'
              ? !!INPUT_NODES[t.data.kind]
              : MAPPER_TYPES.has(t.type) || t.type === 'inputJson'
                ? !!CORE_NODES[t.data.kind]
                : !!TRANSFORMS[t.data.transformId],
        )
        .map((t) => ({
          ...t,
          data: {
            ...t.data,
            label:
              t.data.label ??
              (t.type === 'ruleOutput' || t.type === 'debugNode'
                ? NODE_DEFS[t.data.kind]?.label
                : TRANSFORMS[t.data.transformId]?.label),
          },
        }))
      txIdRef.current = Math.max(
        0,
        ...txNodes.map((t) => Number(/^tx-(\d+)$/.exec(t.id)?.[1]) || 0),
      )
      outIdRef.current = Math.max(
        0,
        ...txNodes.map((t) => Number(/^out-(\d+)$/.exec(t.id)?.[1]) || 0),
      )
      inIdRef.current = Math.max(
        0,
        ...txNodes.map((t) => Number(/^in-(\d+)$/.exec(t.id)?.[1]) || 0),
      )
      mapIdRef.current = Math.max(
        0,
        ...txNodes.map((t) => Number(/^map-(\d+)$/.exec(t.id)?.[1]) || 0),
      )
      const migratedParams = {}
      if (
        (restored.edges ?? []).some(
          (e) => e.source === 'json-root' || e.target === 'json-root',
        )
      ) {
        const nid = `map-${++mapIdRef.current}`
        txNodes.push({
          id: nid,
          type: 'inputJson',
          position: posMap['json-root'] ?? { x: 60, y: 60 },
          width: NODE_WIDTH.inputJson,
          data: {
            kind: 'input_json',
            label: 'INPUT JSON',
            name: 'INPUT JSON',
          },
        })
        migratedParams[nid] = { value: jsonData?.value ?? {} }
        for (const e of restored.edges) {
          if (e.source === 'json-root') e.source = nid
          if (e.target === 'json-root') e.target = nid
        }
      }
      setNodes([...nodes, ...txNodes])
      const restoredEdges = (restored.edges ?? [])
        .filter((e) => e.id && e.source && e.target)
        .map((e) => ({ ...e, style: EDGE_STYLE, reconnectable: true }))
      requestAnimationFrame(() => setEdges(restoredEdges))
      setNodeParams({ ...(restored.nodeParams ?? {}), ...migratedParams })
      setCollapsed(
        Object.fromEntries(
          Object.entries(restored.collapsed ?? {}).map(([k, v]) => [k, new Set(v)]),
        ),
      )
      setSel(restored.sel ?? null)
      didInitFitRef.current = true
      requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }))
      return
    }
    setNodes((prev) => {
      const pos = Object.fromEntries(prev.map((n) => [n.id, n.position]))
      return [
        ...nodes.map((n) => (pos[n.id] ? { ...n, position: pos[n.id] } : n)),
        ...prev.filter((n) => n.type !== 'jsonNode'),
      ]
    })
    const validMapperTargets = new Set(
      toRows(outputData ?? {}).map((r) => `t-${r.id}`),
    )
    setEdges((prev) => {
      const kept = prev.filter(
        (e) =>
          !(
            (e.target === 'fields' ||
              MAPPER_TYPES.has(getNode(e.target)?.type)) &&
            e.targetHandle?.startsWith('t-') &&
            !validMapperTargets.has(e.targetHandle)
          ),
      )
      const have = new Set(
        kept.map(
          (e) => `${e.source}|${e.sourceHandle}|${e.target}|${e.targetHandle}`,
        ),
      )
      return [
        ...kept,
        ...edges.filter(
          (e) =>
            !have.has(
              `${e.source}|${e.sourceHandle}|${e.target}|${e.targetHandle}`,
            ),
        ),
      ]
    })
    if (!didInitFitRef.current) {
      didInitFitRef.current = true
      setPendingSource(null)
      setSel(null)
      setCollapsed({})
      requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }))
    }
  }, [jsonData, outputData, setNodes, setEdges, fitView, restoreTick, getNode])

  const highlighted = useMemo(() => {
    const rows = { 'json-root': new Set(), fields: new Set() }
    const tNodes = new Set()
    const edgeIds = new Set()
    if (pendingSource)
      (rows[pendingSource.node] ??= new Set()).add(pendingSource.row)
    if (!sel) return { rows, tNodes, edgeIds }

    if (sel.rowId) (rows[sel.nodeId] ??= new Set()).add(sel.rowId)
    const traverse = (startEdges, forward) => {
      let frontier = startEdges
      for (let i = 0; i < 12 && frontier.length; i++) {
        const next = []
        for (const e of frontier) {
          edgeIds.add(e.id)
          const nxt = forward ? e.target : e.source
          if (nxt === 'fields') rows.fields.add(e.targetHandle?.slice(2))
          else if (nxt === 'json-root' || getNode(nxt)?.type === 'inputJson')
            (rows[nxt] ??= new Set()).add(e.sourceHandle?.slice(2))
          else {
            tNodes.add(nxt)
            if (MAPPER_TYPES.has(getNode(nxt)?.type))
              (rows[nxt] ??= new Set()).add(
                (forward ? e.sourceHandle : e.targetHandle)?.slice(2),
              )
            next.push(...edges.filter((x) => (forward ? x.source === nxt : x.target === nxt)))
          }
        }
        frontier = next
      }
    }
    if (sel.nodeId === 'json-root' || getNode(sel.nodeId)?.type === 'inputJson') {
      if (sel.rowId) {
        traverse(edges.filter((e) => e.source === sel.nodeId && e.sourceHandle === `s-${sel.rowId}`), true)
      } else {
        tNodes.add(sel.nodeId)
        traverse(edges.filter((e) => e.source === sel.nodeId), true)
      }
    } else if (sel.nodeId === 'fields') {
      if (sel.rowId) {
        traverse(edges.filter((e) => e.target === 'fields' && e.targetHandle === `t-${sel.rowId}`), false)
      } else {
        tNodes.add('fields')
        traverse(edges.filter((e) => e.target === 'fields'), false)
      }
    } else {
      tNodes.add(sel.nodeId)
      if (sel.rowId) {
        traverse(
          edges.filter(
            (e) => e.target === sel.nodeId && e.targetHandle === `t-${sel.rowId}`,
          ),
          false,
        )
        traverse(edges.filter((e) => e.source === sel.nodeId), true)
      } else {
        traverse(edges.filter((e) => e.source === sel.nodeId), true)
        traverse(edges.filter((e) => e.target === sel.nodeId), false)
      }
    }
    return { rows, tNodes, edgeIds }
  }, [sel, pendingSource, edges, getNode])

  const displayEdges = useMemo(() => {
    const remap = (handle, nodeId, prefix) => {
      if (!handle?.startsWith(prefix)) return handle
      const segs = handle.slice(2).split('.')
      for (let i = 1; i < segs.length; i++) {
        const anc = segs.slice(0, i).join('.')
        if (collapsed[nodeId]?.has(anc)) return `${prefix}${anc}`
      }
      return handle
    }
    const inactive = !sel && !pendingSource && !dropEdgeId
    return edges.map((e) => {
      const base = {
        ...e,
        sourceHandle: remap(e.sourceHandle, e.source, 's-'),
        targetHandle: remap(e.targetHandle, e.target, 't-'),
      }
      if (dropEdgeId) {
        return base.id === dropEdgeId
          ? { ...base, style: EDGE_DROP_STYLE, animated: true }
          : { ...base, style: EDGE_DIM_STYLE }
      }
      if (e.selected) return { ...base, style: EDGE_SELECTED_STYLE, animated: true }
      if (inactive) return base
      const linked = highlighted.edgeIds.has(e.id)
      return { ...base, style: linked ? EDGE_HI_STYLE : sel || pendingSource ? EDGE_DIM_STYLE : EDGE_STYLE }
    })
  }, [edges, sel, pendingSource, dropEdgeId, highlighted, collapsed])

  const nodeSig = nodes.map((n) => `${n.id}:${n.type}`).join('|')

  useEffect(() => {
    const inputObj = jsonData?.value
    const commitOutput = (next) => {
      onUpdateOutput?.(next)
      requestAnimationFrame(() => {
        for (const x of getNodes())
          if (x.id === 'fields' || MAPPER_TYPES.has(x.type))
            updateNodeInternals(x.id)
      })
    }
    setNodes((ns) => {
      const tNodeMap = Object.fromEntries(
        ns.filter((n) => n.type !== 'jsonNode').map((n) => [n.id, n]),
      )
      const resolver = makeResolver(edges, inputObj, tNodeMap, nodeParams, outputData)
      return ns.map((n) => {
        const data = {
          ...n.data,
          onRowClick: (rowId) => handleRowClick(n.id, rowId),
          onToggle: (rowId) => toggleCollapsed(n.id, rowId),
          onParamChange: (key, val) => setParam(n.id, key, val),
          collapsedIds: collapsed[n.id],
          selectedIds: [...(highlighted.rows[n.id] ?? [])],
          highlighted: highlighted.tNodes.has(n.id),
          onBrowse:
            n.type === 'inputJson'
              ? () => onBrowseNodeInput?.(n.id)
              : n.id === 'json-root'
                ? onBrowseFile
                : n.id === 'fields' || MAPPER_TYPES.has(n.type)
                  ? onBrowseOutput
                  : undefined,
          onPasteJson:
            n.type === 'inputJson'
              ? () => onPasteNodeInput?.(n.id)
              : n.id === 'json-root'
                ? onPasteJson
                : n.id === 'fields' || MAPPER_TYPES.has(n.type)
                  ? onPasteOutput
                  : undefined,
        }
        if (n.type === 'inputJson') {
          data.value = nodeParams[n.id]?.value ?? {}
          data.name = 'INPUT JSON'
          data.subName = jsonData?.name
          const values = {}
          for (const e of edges) {
            if (e.target === n.id && e.targetHandle) {
              const v = resolver.at(n.id, e.targetHandle)
              if (v !== undefined) values[e.targetHandle.slice(2)] = v
            }
          }
          data.values = values
        }
        if (n.id === 'fields' || MAPPER_TYPES.has(n.type)) {
          data.value = outputData ?? {}
          if (MAPPER_TYPES.has(n.type)) {
            data.name ??= CORE_NODES[n.data.kind]?.label.toUpperCase()
            data.rootHandle = true
          }
          const values = {}
          for (const e of edges) {
            if (e.target === n.id && e.targetHandle) {
              const v = resolver.at(n.id, e.targetHandle)
              if (v !== undefined) values[e.targetHandle.slice(2)] = v
            }
          }
          data.values = values
          data.onFieldSave = (path, f) => {
            const next = JSON.parse(JSON.stringify(outputData ?? {}))
            const segs = path.split('.')
            const parent = segs.slice(0, -1).reduce((o, k) => o?.[k], next)
            const key = segs[segs.length - 1]
            const leaf = parent?.[key]
            if (parent == null || leaf === undefined) return
            const upd = {
              ...(leaf !== null && typeof leaf === 'object' ? leaf : {}),
              type: f.type,
            }
            if (f.unit) upd.unit = f.unit
            else delete upd.unit
            if (f.source !== undefined) {
              if (f.source) upd.source = f.source
              else delete upd.source
            }
            if (Array.isArray(parent)) {
              parent[Number(key)] = upd
            } else {
              const newKey =
                f.name?.trim() && !(f.name.trim() in parent && f.name.trim() !== key)
                  ? f.name.trim()
                  : key
              const entries = Object.entries(parent).map(([k, v]) =>
                k === key ? [newKey, upd] : [k, v],
              )
              for (const k of Object.keys(parent)) delete parent[k]
              Object.assign(parent, Object.fromEntries(entries))
            }
            commitOutput(next)
          }
          data.onFieldDelete = (path) => {
            const next = JSON.parse(JSON.stringify(outputData ?? {}))
            const segs = path.split('.')
            const parent = segs.slice(0, -1).reduce((o, k) => o?.[k], next)
            if (Array.isArray(parent)) parent.splice(Number(segs[segs.length - 1]), 1)
            else if (parent && typeof parent === 'object') delete parent[segs[segs.length - 1]]
            commitOutput(next)
          }
          data.maxDepth = 3
          data.onAddChild = (path, f) => {
            const next = JSON.parse(JSON.stringify(outputData ?? {}))
            let parent = next
            if (path) {
              const segs = path.split('.')
              parent = segs.reduce((o, k) => o?.[k], next)
              if (isField(parent)) {
                if (parent.type !== 'object' && parent.type !== 'array') return
                const gp = segs.slice(0, -1).reduce((o, k) => o?.[k], next)
                const rest = Object.fromEntries(
                  Object.entries(parent).filter(
                    ([k]) => !['type', 'unit', 'source'].includes(k),
                  ),
                )
                gp[segs[segs.length - 1]] = parent = parent.type === 'array' ? [] : rest
              }
            }
            const child =
              f.type === 'object' ? {} : f.type === 'array' ? [] : { type: f.type, unit: f.unit }
            if (Array.isArray(parent)) {
              const key = f.name?.trim()
              parent.push(key ? { [key]: child } : child)
            } else if (parent && typeof parent === 'object') {
              const key = f.name?.trim()
              if (!key) return
              parent[key] = child
            } else return
            commitOutput(next)
          }
          data.onFieldMove = (srcId, dstId, pos) => {
            if (srcId === dstId) return
            const sSegs = srcId.split('.')
            const sParent = sSegs.slice(0, -1).join('.')
            const dSegs = dstId.split('.')
            if (sParent !== dSegs.slice(0, -1).join('.')) return
            const next = JSON.parse(JSON.stringify(outputData ?? {}))
            const parent = sParent
              ? sParent.split('.').reduce((o, k) => o?.[k], next)
              : next
            if (!parent || typeof parent !== 'object') return
            const sKey = sSegs[sSegs.length - 1]
            const dKey = dSegs[dSegs.length - 1]
            if (Array.isArray(parent)) {
              const from = Number(sKey)
              const to = Number(dKey)
              if (
                !Number.isInteger(from) ||
                !Number.isInteger(to) ||
                from < 0 ||
                to < 0 ||
                from >= parent.length ||
                to >= parent.length
              )
                return
              const [item] = parent.splice(from, 1)
              const idx = to > from ? to - 1 : to
              const insertAt = pos === 'before' ? idx : idx + 1
              parent.splice(insertAt, 0, item)
              if (insertAt !== from) {
                const prefix = `${sParent}.`
                const mapIdx = (o) =>
                  o === from
                    ? insertAt
                    : insertAt > from && o > from && o <= insertAt
                      ? o - 1
                      : insertAt < from && o >= insertAt && o < from
                        ? o + 1
                        : o
                const remapPath = (p) => {
                  if (typeof p !== 'string' || !p.startsWith(prefix)) return p
                  const rest = p.slice(prefix.length)
                  const seg = rest.split('.')[0]
                  const i = Number(seg)
                  if (!seg || !Number.isInteger(i)) return p
                  return `${prefix}${mapIdx(i)}${rest.slice(seg.length)}`
                }
                const remapHandle = (h) =>
                  h && (h.startsWith('t-') || h.startsWith('s-'))
                    ? `${h.slice(0, 2)}${remapPath(h.slice(2))}`
                    : h
                const isStruct = (id) =>
                  id === 'fields' || MAPPER_TYPES.has(getNode(id)?.type)
                setEdges((es) =>
                  es.map((e) => {
                    const sourceHandle = isStruct(e.source)
                      ? remapHandle(e.sourceHandle)
                      : e.sourceHandle
                    const targetHandle = isStruct(e.target)
                      ? remapHandle(e.targetHandle)
                      : e.targetHandle
                    return sourceHandle === e.sourceHandle &&
                      targetHandle === e.targetHandle
                      ? e
                      : { ...e, sourceHandle, targetHandle }
                  }),
                )
                setCollapsed((c) =>
                  Object.fromEntries(
                    Object.entries(c).map(([nid, s]) => [
                      nid,
                      new Set([...s].map(remapPath)),
                    ]),
                  ),
                )
                setSel((s) =>
                  s?.rowId ? { ...s, rowId: remapPath(s.rowId) } : s,
                )
                setPendingSource((p) =>
                  p ? { ...p, row: remapPath(p.row) } : p,
                )
              }
            } else {
              const entries = Object.entries(parent)
              const from = entries.findIndex(([k]) => k === sKey)
              const to = entries.findIndex(([k]) => k === dKey)
              if (from < 0 || to < 0) return
              const [item] = entries.splice(from, 1)
              const idx = to > from ? to - 1 : to
              entries.splice(pos === 'before' ? idx : idx + 1, 0, item)
              for (const k of Object.keys(parent)) delete parent[k]
              Object.assign(parent, Object.fromEntries(entries))
            }
            commitOutput(next)
          }
          if (n.type === 'mapperV2')
            data.onAddField = (name, type, unit) =>
              data.onAddChild('', { name, type, unit })
        }
        if (n.type === 'transform') {
          const def = TRANSFORMS[n.data.transformId]
          data.params =
            nodeParams[n.id] ??
            Object.fromEntries((def?.params ?? []).map((p) => [p.key, p.default ?? '']))
          const ins = edges.filter((e) => e.target === n.id)
          const out = !def || !ins.length
            ? undefined
            : def.multiInput
              ? def.apply(
                  ins.map((x) => resolver.edgeVal(x, 0)),
                  nodeParams[n.id],
                )
              : def.apply(resolver.edgeVal(ins[0], 0), nodeParams[n.id])
          data.preview = out == null ? null : String(out)
        }
        if (n.type === 'ruleOutput' || n.type === 'debugNode') {
          const def = NODE_DEFS[n.data.kind]
          data.params = nodeParams[n.id] ?? {}
          data.wired = new Set(
            edges.filter((e) => e.target === n.id).map((e) => e.targetHandle?.slice(2)),
          )
          const fv = {}
          for (const f of def?.fields ?? []) {
            const v = resolver.at(n.id, `t-${f.key}`)
            fv[f.key] = v === undefined ? (data.params[f.key] ?? f.default) : v
          }
          data.fieldValues = fv
          data.assembled = def?.serialize
            ? def.serialize(fv, data.params)
            : Object.fromEntries((def?.fields ?? []).map((f) => [f.key, fv[f.key]]))
        }
        if (n.type === 'stringInput') {
          const def = INPUT_NODES[n.data.kind] ?? INPUT_NODES.string_field
          data.params = nodeParams[n.id] ?? {}
          const ins = edges.filter((e) => e.target === n.id)
          data.wired = ins.length > 0
          data.wiredValue = def.multiInput
            ? ins.map((x) => resolver.edgeVal(x, 0))
            : ins.length
              ? def.coerce(resolver.edgeVal(ins[0], 0), nodeParams[n.id])
              : undefined
        }
        const customName = nodeParams[n.id]?.name
        if (customName) {
          data.name = customName
          data.label = customName
        }
        data.onRename = (name) => setParam(n.id, 'name', name || undefined)
        return { ...n, data }
      })
    })
  }, [highlighted, handleRowClick, toggleCollapsed, setParam, collapsed, nodeParams, setNodes, setEdges, setSel, setCollapsed, setPendingSource, jsonData, outputData, edges, makeResolver, nodeSig, onBrowseFile, onPasteJson, onBrowseOutput, onPasteOutput, onUpdateOutput, onBrowseNodeInput, onPasteNodeInput, getNodes, updateNodeInternals])

  const makeSnapshot = useCallback(
    () => ({
      v: 1,
      sig,
      transforms: nodes
        .filter((n) => n.type !== 'jsonNode')
        .map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          width: n.width,
          data: { label: n.data.label, transformId: n.data.transformId, kind: n.data.kind },
        })),
      edges: edges.map(
        ({ id, source, sourceHandle, target, targetHandle, selected }) => ({
          id,
          source,
          sourceHandle,
          target,
          targetHandle,
          selected,
        }),
      ),
      sel,
      positions: Object.fromEntries(
        nodes
          .filter((n) => n.id === 'json-root' || n.id === 'fields')
          .map((n) => [n.id, n.position]),
      ),
      fieldsRemoved: !nodes.some((n) => n.id === 'fields'),
      nodeParams,
      collapsed: Object.fromEntries(
        Object.entries(collapsed).map(([k, s]) => [k, [...s]]),
      ),
    }),
    [nodes, edges, nodeParams, collapsed, sel, sig],
  )

  useEffect(() => {
    if (apiRef)
      apiRef.current = {
        serializeGraph: makeSnapshot,
        restoreGraph: (g) => {
          restoredRef.current = g
          lastBuildRef.current = null
          setRestoreTick((t) => t + 1)
        },
        getNodeInput: (nodeId) => nodeParams[nodeId]?.value,
        setNodeInput: (nodeId, text) => {
          const res = validateJson(text)
          setParam(nodeId, 'value', res.ok ? res.value : {})
        },
      }
    return () => {
      if (apiRef) apiRef.current = null
    }
  }, [apiRef, makeSnapshot, nodeParams, setParam])

  useEffect(() => {
    if (!nodes.length) return
    try {
      localStorage.setItem(GRAPH_KEY, JSON.stringify(makeSnapshot()))
    } catch {}
  }, [nodes, edges, makeSnapshot])

  // Migrate nodes created before debugNode was its own type
  useEffect(() => {
    setNodes((ns) =>
      ns.some((n) => n.type === 'ruleOutput' && DEBUG_NODES[n.data?.kind])
        ? ns.map((n) =>
            n.type === 'ruleOutput' && DEBUG_NODES[n.data?.kind]
              ? { ...n, type: 'debugNode' }
              : n,
          )
        : ns,
    )
  }, [setNodes])

  return (
    <Box
      sx={{ position: 'relative', width: '100%', height: '100%' }}
      onDragOver={onDragOver}
      onDragLeave={() => setDropEdgeId(null)}
      onDrop={onDrop}
    >
      {pendingSource && (
        <Chip
          size="small"
          color="primary"
          label={`Linking from “${pendingSource.row}” — click a field on the right · Esc to cancel`}
          sx={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
        />
      )}
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        isValidConnection={acceptsConnection}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onBeforeDelete={onBeforeDelete}
        reconnectRadius={15}
        deleteKeyCode={['Backspace', 'Delete']}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="#2a2f3d" />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </Box>
  )
}

const loadSavedTexts = () => {
  const fallback = { jsonText: sampleInputText, outputText: sampleOutputText, name: 'sample.json' }
  try {
    return { ...fallback, ...(JSON.parse(localStorage.getItem(TEXT_KEY)) ?? {}) }
  } catch {
    return fallback
  }
}

const ACCORDION_SX = { bgcolor: 'transparent', '&::before': { display: 'none' } }
const ACCORDION_SUMMARY_SX = { px: 0, minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }
const MONO_TEXTFIELD_SX = { '& textarea': { fontFamily: 'monospace', fontSize: 12 } }

function App() {
  const [initial] = useState(() => {
    const texts = loadSavedTexts()
    return {
      texts,
      input: validateJson(texts.jsonText),
      output: validateJson(texts.outputText),
    }
  })
  const [jsonText, setJsonText] = useState(initial.texts.jsonText)
  const [jsonData, setJsonData] = useState(() =>
    initial.input.ok ? { name: initial.texts.name, value: initial.input.value } : null,
  )
  const [, setValidation] = useState(initial.input)
  const [outputText, setOutputText] = useState(initial.texts.outputText)
  const [outputData, setOutputData] = useState(() =>
    initial.output.ok ? stripEmptySource(initial.output.value) : null,
  )
  const [, setOutputValidation] = useState(initial.output)
  const fileInputRef = useRef(null)
  const fileOutputRef = useRef(null)
  const openInputPicker = useCallback(() => fileInputRef.current?.click(), [])

  const applyOutputText = useCallback((text) => {
    if (!text.trim()) {
      setOutputValidation({ ok: true, errors: [], warnings: [] })
      setOutputData(null)
      return
    }
    const res = validateJson(text)
    setOutputValidation(res)
    if (!res.ok) {
      setOutputData(null)
      return
    }
    const cleaned = stripEmptySource(res.value)
    setOutputData(cleaned)
    if (JSON.stringify(cleaned) !== JSON.stringify(res.value))
      setOutputText(JSON.stringify(cleaned, null, 2))
  }, [])

  const renderJson = useCallback(
    (text, name = 'JSON', outText = null) => {
      const res = validateJson(text)
      setValidation(res)
      setJsonData(res.ok ? { name, value: res.value } : null)
      applyOutputText(outText ?? outputText)
    },
    [outputText, applyOutputText],
  )

  const openOutputPicker = useCallback(() => fileOutputRef.current?.click(), [])
  const [paletteFilter, setPaletteFilter] = useState('')
  const nodeMatches = useCallback(
    (n) => {
      const q = paletteFilter.trim().toLowerCase()
      if (!q) return true
      return (
        n.label?.toLowerCase().includes(q) ||
        n.description?.toLowerCase().includes(q) ||
        n.id?.toLowerCase().includes(q)
      )
    },
    [paletteFilter],
  )
  const [pasteState, setPasteState] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const onPasteJson = useCallback(() => {
    setPasteText(jsonText)
    setPasteState('input')
  }, [jsonText])
  const onPasteOutput = useCallback(() => {
    setPasteText(outputText)
    setPasteState('output')
  }, [outputText])
  const submitPaste = useCallback(() => {
    if (pasteState === 'output') {
      setOutputText(pasteText)
      applyOutputText(pasteText)
    } else if (pasteState?.kind === 'nodeInput') {
      canvasApiRef.current?.setNodeInput?.(pasteState.nodeId, pasteText)
    } else {
      setJsonText(pasteText)
      renderJson(pasteText)
    }
    setPasteState(null)
  }, [pasteState, pasteText, renderJson, applyOutputText])

  const canvasApiRef = useRef(null)
  const flowFileRef = useRef(null)
  const flowFilePickerRef = useRef(null)
  const [saveAs, setSaveAs] = useState(null)
  const [flowError, setFlowError] = useState(null)
  const flowText = useCallback(
    (format) => {
      const flow = {
        app: 'json-node-mapper',
        v: 1,
        name: flowFileRef.current?.name ?? 'flow',
        jsonText,
        outputText,
        graph: canvasApiRef.current?.serializeGraph?.() ?? null,
      }
      return format === 'yaml' ? yamlStringify(flow) : JSON.stringify(flow, null, 2)
    },
    [jsonText, outputText],
  )

  const writeFlowHandle = useCallback(
    async (handle) => {
      const w = await handle.createWritable()
      await w.write(
        flowText(/\.ya?ml$/i.test(handle.name) ? 'yaml' : 'json'),
      )
      await w.close()
    },
    [flowText],
  )

  const downloadFlow = useCallback(
    (name, format) => {
      const blob = new Blob([flowText(format)], {
        type: format === 'yaml' ? 'text/yaml' : 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name}.${format === 'yaml' ? 'yaml' : 'json'}`
      a.click()
      URL.revokeObjectURL(url)
      flowFileRef.current = { name, format, handle: null }
    },
    [flowText],
  )

  const onSaveAsFlow = useCallback(async () => {
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const f = flowFileRef.current
        const handle = await window.showSaveFilePicker({
          suggestedName: `${f?.name ?? 'flow'}.${f?.format === 'yaml' ? 'yaml' : 'json'}`,
          types: [
            { description: 'JSON', accept: { 'application/json': ['.json'] } },
            { description: 'YAML', accept: { 'text/yaml': ['.yaml', '.yml'] } },
          ],
        })
        await writeFlowHandle(handle)
        flowFileRef.current = {
          name: handle.name.replace(/\.(json|ya?ml)$/i, ''),
          format: /\.ya?ml$/i.test(handle.name) ? 'yaml' : 'json',
          handle,
        }
      } catch (err) {
        if (err?.name !== 'AbortError') setFlowError(`Save failed: ${err?.message ?? err}`)
      }
      return
    }
    setSaveAs({
      name: flowFileRef.current?.name ?? 'flow',
      format: flowFileRef.current?.format ?? 'json',
    })
  }, [writeFlowHandle])

  const onSaveFlow = useCallback(async () => {
    const f = flowFileRef.current
    if (f?.handle) {
      try {
        await writeFlowHandle(f.handle)
        return
      } catch {
        // handle stale/revoked — fall through to pick a new file
      }
    }
    if (typeof window.showSaveFilePicker === 'function') {
      await onSaveAsFlow()
      return
    }
    if (f) downloadFlow(f.name, f.format)
    else setSaveAs({ name: 'flow', format: 'json' })
  }, [writeFlowHandle, onSaveAsFlow, downloadFlow])

  const onLoadFlow = useCallback(
    (file, handle = null) => {
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const isYaml = /\.ya?ml$/i.test(file.name)
        const base = file.name.replace(/\.(json|ya?ml)$/i, '')
        try {
          const text = String(reader.result)
          const flow = isYaml ? yamlParse(text) : JSON.parse(text)
          if (!flow || typeof flow !== 'object' || !flow.graph) {
            setFlowError(`“${file.name}” is not a valid flow file`)
            return
          }
          const inText = flow.jsonText ?? ''
          const outText = flow.outputText ?? ''
          setFlowError(null)
          setJsonText(inText)
          setOutputText(outText)
          renderJson(inText, base, outText)
          canvasApiRef.current?.restoreGraph?.(flow.graph)
          flowFileRef.current = { name: base, format: isYaml ? 'yaml' : 'json', handle }
        } catch {
          setFlowError(`Could not parse “${file.name}” as ${isYaml ? 'YAML' : 'JSON'}`)
        }
      }
      reader.readAsText(file)
    },
    [renderJson],
  )

  const openFlowPicker = useCallback(async () => {
    if (typeof window.showOpenFilePicker === 'function') {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'Flow',
              accept: { 'application/json': ['.json'], 'text/yaml': ['.yaml', '.yml'] },
            },
          ],
          multiple: false,
        })
        onLoadFlow(await handle.getFile(), handle)
      } catch (err) {
        if (err?.name !== 'AbortError') setFlowError(`Open failed: ${err?.message ?? err}`)
      }
      return
    }
    flowFilePickerRef.current?.click()
  }, [onLoadFlow])

  const pendingNodeInputRef = useRef(null)
  const onBrowseNodeInput = useCallback((nodeId) => {
    pendingNodeInputRef.current = nodeId
    fileInputRef.current?.click()
  }, [])
  const onPasteNodeInput = useCallback(
    (nodeId) => {
      const cur = canvasApiRef.current?.getNodeInput?.(nodeId)
      setPasteText(cur !== undefined ? JSON.stringify(cur, null, 2) : jsonText)
      setPasteState({ kind: 'nodeInput', nodeId })
    },
    [jsonText],
  )

  const onNewFlow = useCallback(() => {
    setFlowError(null)
    flowFileRef.current = null
    setJsonText('')
    setValidation({ ok: true, errors: [], warnings: [] })
    setJsonData(null)
    setOutputText('')
    applyOutputText('')
    canvasApiRef.current?.restoreGraph?.({
      v: 1,
      transforms: [],
      edges: [],
      sel: null,
      positions: {},
      fieldsRemoved: true,
      nodeParams: {},
      collapsed: {},
    })
    localStorage.removeItem(GRAPH_KEY)
  }, [applyOutputText])

  const handleFile = useCallback(
    (file) => {
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const text = String(reader.result)
        const nid = pendingNodeInputRef.current
        pendingNodeInputRef.current = null
        if (nid) canvasApiRef.current?.setNodeInput?.(nid, text)
        else {
          setJsonText(text)
          renderJson(text, file.name)
        }
      }
      reader.onerror = () =>
        setValidation({
          ok: false,
          errors: [{ message: 'Could not read the selected file' }],
          warnings: [],
        })
      reader.readAsText(file)
    },
    [renderJson],
  )

  const onUpdateOutput = useCallback((next) => {
    const text = JSON.stringify(stripEmptySource(next), null, 2)
    setOutputText(text)
    const res = validateJson(text)
    setOutputValidation(res)
    if (res.ok) setOutputData(res.value)
  }, [])

  const handleOutputFile = useCallback((file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result)
      setOutputText(text)
      applyOutputText(text)
    }
    reader.onerror = () =>
      setOutputValidation({
        ok: false,
        errors: [{ message: 'Could not read the selected file' }],
        warnings: [],
      })
    reader.readAsText(file)
  }, [applyOutputText])

  useEffect(() => {
    const onPaste = (e) => {
      if (['TEXTAREA', 'INPUT'].includes(e.target?.tagName)) return
      const text = e.clipboardData?.getData('text')
      if (text) {
        setJsonText(text)
        renderJson(text)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [renderJson])

  useEffect(() => {
    try {
      localStorage.setItem(
        TEXT_KEY,
        JSON.stringify({ jsonText, outputText, name: jsonData?.name ?? 'JSON' }),
      )
    } catch {}
  }, [jsonText, outputText, jsonData])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar variant="dense">
          <AccountTreeIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            JSON → Node
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            Paste JSON or browse a file to render it as a node
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Paper
          square
          elevation={0}
          sx={{
            width: 380,
            flexShrink: 0,
            p: 2,
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            overflowY: 'auto',
          }}
        >
          <Accordion disableGutters elevation={0} defaultExpanded sx={ACCORDION_SX}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORDION_SUMMARY_SX}>
              <Typography variant="subtitle2">Flow</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Stack spacing={0.5}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<NoteAddIcon />}
                  onClick={onNewFlow}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  New
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={onSaveFlow}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SaveAsIcon />}
                  onClick={onSaveAsFlow}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Save As…
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FolderOpenIcon />}
                  onClick={openFlowPicker}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Load from…
                </Button>
              </Stack>
              <input
                ref={flowFilePickerRef}
                type="file"
                accept=".json,.yaml,.yml,application/json,text/yaml"
                hidden
                onChange={(e) => {
                  onLoadFlow(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              {flowError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {flowError}
                </Alert>
              )}
            </AccordionDetails>
          </Accordion>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <input
            ref={fileOutputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => handleOutputFile(e.target.files?.[0])}
          />

          <Divider />
          <Typography variant="subtitle2">Nodes</Typography>
          <TextField
            size="small"
            variant="outlined"
            fullWidth
            placeholder="Filter nodes…"
            value={paletteFilter}
            onChange={(e) => setPaletteFilter(e.target.value)}
            slotProps={{
              htmlInput: { style: { fontSize: 13, padding: '7px 8px' } },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          {(!!paletteFilter.trim() ? CORE_NODE_LIST.some(nodeMatches) : true) && (
          <Accordion disableGutters elevation={0} defaultExpanded sx={ACCORDION_SX}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORDION_SUMMARY_SX}>
              <Typography variant="subtitle2">Core nodes</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Drag a mapper onto the canvas — wire input fields to its rows.
              </Typography>
              <Stack spacing={1}>
              {CORE_NODE_LIST.filter(nodeMatches).map((c) => (
                <Paper
                  key={c.id}
                  variant="outlined"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-core-node', c.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  sx={{
                    p: 1,
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:active': { cursor: 'grabbing' },
                  }}
                >
                  <AccountTreeIcon fontSize="small" sx={{ color: '#7c6cff' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {c.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.description}
                    </Typography>
                  </Box>
                </Paper>
              ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
          )}

          {(!!paletteFilter.trim() ? TRANSFORM_LIST.some(nodeMatches) : true) && (
          <Accordion disableGutters elevation={0} defaultExpanded sx={ACCORDION_SX}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORDION_SUMMARY_SX}>
              <Typography variant="subtitle2">Transformation nodes</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Drag a rule onto an edge to insert it between input and output.
              </Typography>
              <Stack spacing={1}>
              {TRANSFORM_LIST.filter(nodeMatches).map((t) => (
                <Paper
                  key={t.id}
                  variant="outlined"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-transform-node', t.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  sx={{
                    p: 1,
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:active': { cursor: 'grabbing' },
                  }}
                >
                  <AutoFixHighIcon fontSize="small" sx={{ color: '#9d92ff' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {t.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.description}
                    </Typography>
                  </Box>
                </Paper>
              ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
          )}

          {(!!paletteFilter.trim() ? OUTPUT_NODE_LIST.some(nodeMatches) : true) && (
          <Accordion disableGutters elevation={0} defaultExpanded sx={ACCORDION_SX}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORDION_SUMMARY_SX}>
              <Typography variant="subtitle2">Output nodes</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Drag an output node onto the canvas — wire the OUTPUT JSON node&apos;s
                header connector to its field_mappings input.
              </Typography>
              <Stack spacing={1}>
              {OUTPUT_NODE_LIST.filter(nodeMatches).map((o) => (
                <Paper
                  key={o.id}
                  variant="outlined"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-output-node', o.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  sx={{
                    p: 1,
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:active': { cursor: 'grabbing' },
                  }}
                >
                  <DataObjectIcon fontSize="small" sx={{ color: '#66d19e' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {o.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {o.description}
                    </Typography>
                  </Box>
                </Paper>
              ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
          )}

          {(!!paletteFilter.trim() ? INPUT_NODE_LIST.some(nodeMatches) : true) && (
          <Accordion disableGutters elevation={0} defaultExpanded sx={ACCORDION_SX}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORDION_SUMMARY_SX}>
              <Typography variant="subtitle2">Input nodes</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Drag an input node onto the canvas — its right connector feeds other nodes.
              </Typography>
              <Stack spacing={1}>
              {INPUT_NODE_LIST.filter(nodeMatches).map((o) => {
                const Icon = INPUT_TYPE_ICONS[o.type] ?? AbcIcon
                return (
                <Paper
                  key={o.id}
                  variant="outlined"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-input-node', o.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  sx={{
                    p: 1,
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:active': { cursor: 'grabbing' },
                  }}
                >
                  <Icon fontSize="small" sx={{ color: '#5eb4ff' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {o.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {o.description}
                    </Typography>
                  </Box>
                </Paper>
                )
              })}
              </Stack>
            </AccordionDetails>
          </Accordion>
          )}

          {(!!paletteFilter.trim() ? DEBUG_NODE_LIST.some(nodeMatches) : true) && (
          <Accordion disableGutters elevation={0} defaultExpanded sx={ACCORDION_SX}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORDION_SUMMARY_SX}>
              <Typography variant="subtitle2">Debug nodes</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Drag a debug node onto the canvas — its left connector takes any node output.
              </Typography>
              <Stack spacing={1}>
              {DEBUG_NODE_LIST.filter(nodeMatches).map((o) => (
                <Paper
                  key={o.id}
                  variant="outlined"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-output-node', o.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  sx={{
                    p: 1,
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:active': { cursor: 'grabbing' },
                  }}
                >
                  <BugReportIcon fontSize="small" sx={{ color: '#ffa726' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {o.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {o.description}
                    </Typography>
                  </Box>
                </Paper>
              ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
          )}

          <Accordion
            disableGutters
            elevation={0}
            sx={{
              mt: 'auto',
              bgcolor: 'transparent',
              borderTop: '1px solid',
              borderColor: 'divider',
              '&::before': { display: 'none' },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ px: 0, minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}
            >
              <Typography variant="subtitle2">Tips</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Paste JSON anywhere on this page (⌘/Ctrl+V).
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Map fields: click a property on the left node, then click a field on the right — or
                drag between the dot handles. Select an edge and press ⌫ to delete; drag an edge end
                to rewire it. Select a node and press ⌘/Ctrl+D to duplicate it.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Dialog open={pasteState !== null} onClose={() => setPasteState(null)} maxWidth="sm" fullWidth>
            <DialogTitle>
              {pasteState === 'output' ? 'Paste output structure JSON' : 'Paste JSON'}
            </DialogTitle>
            <DialogContent>
              <TextField
                multiline
                fullWidth
                autoFocus
                minRows={12}
                maxRows={20}
                placeholder="Paste JSON here…"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                spellCheck={false}
                sx={MONO_TEXTFIELD_SX}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPasteState(null)}>Cancel</Button>
              <Button variant="contained" onClick={submitPaste}>
                Render node
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            open={!!saveAs}
            onClose={() => setSaveAs(null)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>Save flow as</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                fullWidth
                size="small"
                label="File name"
                value={saveAs?.name ?? ''}
                onChange={(e) =>
                  setSaveAs((s) => ({ ...s, name: e.target.value }))
                }
                sx={{ mt: 1 }}
              />
              <TextField
                select
                fullWidth
                size="small"
                label="Format"
                value={saveAs?.format ?? 'json'}
                onChange={(e) =>
                  setSaveAs((s) => ({ ...s, format: e.target.value }))
                }
                sx={{ mt: 1.5 }}
              >
                <MenuItem value="json">JSON (.json)</MenuItem>
                <MenuItem value="yaml">YAML (.yaml)</MenuItem>
              </TextField>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSaveAs(null)}>Cancel</Button>
              <Button
                variant="contained"
                disabled={!saveAs?.name?.trim()}
                onClick={() => {
                  downloadFlow(saveAs.name.trim(), saveAs.format)
                  setSaveAs(null)
                }}
              >
                Save
              </Button>
            </DialogActions>
          </Dialog>
          <ReactFlowProvider>
            <Canvas
              apiRef={canvasApiRef}
              jsonData={jsonData}
              outputData={outputData}
              onBrowseFile={openInputPicker}
              onPasteJson={onPasteJson}
              onBrowseOutput={openOutputPicker}
              onPasteOutput={onPasteOutput}
              onUpdateOutput={onUpdateOutput}
              onBrowseNodeInput={onBrowseNodeInput}
              onPasteNodeInput={onPasteNodeInput}
              sig={hashStr(
                JSON.stringify(jsonData?.value ?? null) +
                  '' +
                  JSON.stringify(outputData ?? null),
              )}
            />
          </ReactFlowProvider>
        </Box>
      </Box>
    </Box>
  )
}

export default App
