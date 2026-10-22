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
  Divider,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AbcIcon from '@mui/icons-material/Abc'
import NumbersIcon from '@mui/icons-material/Numbers'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import DataArrayIcon from '@mui/icons-material/DataArray'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import DataObjectIcon from '@mui/icons-material/DataObject'
import BugReportIcon from '@mui/icons-material/BugReport'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import JsonNode, { toEntries } from './JsonNode.jsx'
import TransformNode from './TransformNode.jsx'
import RuleOutputNode from './RuleOutputNode.jsx'
import InputNode from './InputNode.jsx'
import { validateJson } from './validateJson.js'
import sampleInputText from '../sample_json.json?raw'
import sampleOutputText from '../sample_output.json?raw'

import TRANSFORMS, { TRANSFORM_LIST } from './transforms/index.js'
import OUTPUT_NODES, { OUTPUT_NODE_LIST, DEBUG_NODE_LIST } from './outputNodes.js'
import INPUT_NODES, { INPUT_NODE_LIST } from './inputNodes.js'

const nodeTypes = {
  jsonNode: JsonNode,
  transform: TransformNode,
  ruleOutput: RuleOutputNode,
  stringInput: InputNode,
}

const NODE_WIDTH = { jsonNode: 360, transform: 200, ruleOutput: 260, stringInput: 220 }

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

function Canvas({ jsonData, outputData, sig }) {
  const restoredRef = useRef()
  const lastBuildRef = useRef(null)
  if (restoredRef.current === undefined) restoredRef.current = loadSavedGraph(sig)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [pendingSource, setPendingSource] = useState(null)
  const [sel, setSel] = useState(null)
  const [dropEdgeId, setDropEdgeId] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [nodeParams, setNodeParams] = useState({})
  const txIdRef = useRef(0)
  const outIdRef = useRef(0)
  const inIdRef = useRef(0)
  const { fitView, screenToFlowPosition, getNode, getNodes } = useReactFlow()

  const isMultiTarget = useCallback(
    (nodeId) => {
      const n = getNode(nodeId)
      return n?.type === 'transform' && !!TRANSFORMS[n.data.transformId]?.multiInput
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

  const handleRowClick = useCallback(
    (nodeId, rowId) => {
      if (nodeId === 'json-root') {
        setPendingSource((p) => (p === rowId ? null : rowId))
        setSel((s) =>
          s?.nodeId === nodeId && s.rowId === rowId ? null : { nodeId, rowId },
        )
      } else {
        if (pendingSource) {
          setEdges((eds) =>
            upsertEdge(
              {
                id: `e-${pendingSource}-${rowId}`,
                source: 'json-root',
                sourceHandle: `s-${pendingSource}`,
                target: nodeId,
                targetHandle: `t-${rowId}`,
              },
              eds,
            ),
          )
          setPendingSource(null)
        }
        setSel((s) =>
          s?.nodeId === nodeId && s.rowId === rowId ? null : { nodeId, rowId },
        )
      }
    },
    [pendingSource, setEdges, upsertEdge],
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
      const ref = prefix === 'out' ? outIdRef : prefix === 'in' ? inIdRef : txIdRef
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
              id: `e-${pendingSource}-${node.id}`,
              source: 'json-root',
              sourceHandle: `s-${pendingSource}`,
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
      if (e.source === 'json-root') {
        return e.sourceHandle
          ?.slice(2)
          .split('.')
          .reduce((o, k) => (o == null ? o : o[k]), inputObj)
      }
      if (e.source === 'fields') {
        if (e.sourceHandle === 's-root') return fieldsValue
        return edgeVal(
          eds.find(
            (x) => x.target === 'fields' && x.targetHandle === `t-${e.sourceHandle?.slice(2)}`,
          ),
          depth + 1,
        )
      }
      const tn = nodeMap[e.source]
      if (!tn) return undefined
      if (tn.type === 'ruleOutput') {
        const odef = OUTPUT_NODES[tn.data.kind]
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
        return obj
      }
      if (tn.type === 'stringInput') {
        const def = INPUT_NODES[tn.data.kind] ?? INPUT_NODES.string_field
        const inEdge = eds.find((x) => x.target === tn.id)
        return inEdge
          ? def.coerce(edgeVal(inEdge, depth + 1), paramsMap[tn.id])
          : def.parse(paramsMap[tn.id])
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
      const def = OUTPUT_NODES[kind]
      if (!def) return
      const oId = `out-${++outIdRef.current}`
      setNodes((ns) => [
        ...ns,
        {
          id: oId,
          type: 'ruleOutput',
          position: { x: pos.x - 130, y: pos.y - 40 },
          width: NODE_WIDTH.ruleOutput,
          data: { kind, label: def.label },
        },
      ])
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

  const onBeforeDelete = useCallback(
    ({ nodes: dNodes }) => {
      if (!dNodes.some((n) => n.type !== 'jsonNode')) return true
      setEdges((eds) => {
        let next = eds
        for (const n of dNodes.filter((n) => n.type !== 'jsonNode')) {
          const inEs = next.filter((e) => e.target === n.id)
          const outEs = next.filter((e) => e.source === n.id)
          next = next.filter((e) => !inEs.includes(e) && !outEs.includes(e))
          if (n.type !== 'ruleOutput' && inEs.length === 1) {
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
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
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
    const nodes = [
      {
        id: 'fields',
        type: 'jsonNode',
        position: { x: 620, y: 60 },
        width: NODE_WIDTH.jsonNode,
        data: { name: 'OUTPUT JSON', value: outputData ?? {}, rootHandle: true },
      },
    ]
    const edges = []
    if (jsonData) {
      nodes.unshift({
        id: 'json-root',
        type: 'jsonNode',
        position: { x: 60, y: 60 },
        width: NODE_WIDTH.jsonNode,
        data: { name: 'INPUT JSON', subName: jsonData.name, value: jsonData.value },
      })
      const inputKeys = new Set(toEntries(jsonData.value).map(([k]) => k))
      for (const m of outputData ? collectSources(outputData) : []) {
        if (inputKeys.has(m.source)) {
          edges.push({
            id: `e-${m.source}-${m.path}`,
            source: 'json-root',
            sourceHandle: `s-${m.source}`,
            target: 'fields',
            targetHandle: `t-${m.path}`,
            reconnectable: true,
            style: EDGE_STYLE,
          })
        }
      }
    }
    const restored = restoredRef.current
    restoredRef.current = null
    if (restored) {
      const posMap = restored.positions ?? {}
      for (const n of nodes) if (posMap[n.id]) n.position = posMap[n.id]
      const txNodes = (restored.transforms ?? [])
        .map((t) => ({
          id: t.id,
          type: t.type ?? 'transform',
          position: t.position,
          width: t.width ?? NODE_WIDTH[t.type ?? 'transform'],
          data: {
            label: t.data?.label,
            transformId: t.data?.transformId,
            kind: t.data?.kind,
          },
        }))
        .filter((t) =>
          t.type === 'ruleOutput'
            ? !!OUTPUT_NODES[t.data.kind]
            : t.type === 'stringInput'
              ? !!INPUT_NODES[t.data.kind]
              : !!TRANSFORMS[t.data.transformId],
        )
        .map((t) => ({
          ...t,
          data: {
            ...t.data,
            label:
              t.data.label ??
              (t.type === 'ruleOutput'
                ? OUTPUT_NODES[t.data.kind]?.label
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
      setNodes([...nodes, ...txNodes])
      setEdges(
        (restored.edges ?? [])
          .filter((e) => e.id && e.source && e.target)
          .map((e) => ({ ...e, style: EDGE_STYLE, reconnectable: true })),
      )
      setNodeParams(restored.nodeParams ?? {})
      setCollapsed(
        Object.fromEntries(
          Object.entries(restored.collapsed ?? {}).map(([k, v]) => [k, new Set(v)]),
        ),
      )
      setSel(restored.sel ?? null)
      requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }))
      return
    }
    setNodes((prev) => {
      const pos = Object.fromEntries(prev.map((n) => [n.id, n.position]))
      return nodes.map((n) => (pos[n.id] ? { ...n, position: pos[n.id] } : n))
    })
    setEdges(edges)
    setPendingSource(null)
    setSel(null)
    setCollapsed({})
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }))
  }, [jsonData, outputData, setNodes, setEdges, fitView])

  const highlighted = useMemo(() => {
    const rows = { 'json-root': new Set(), fields: new Set() }
    const tNodes = new Set()
    const edgeIds = new Set()
    if (pendingSource) rows['json-root'].add(pendingSource)
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
          else if (nxt === 'json-root') rows['json-root'].add(e.sourceHandle?.slice(2))
          else {
            tNodes.add(nxt)
            next.push(...edges.filter((x) => (forward ? x.source === nxt : x.target === nxt)))
          }
        }
        frontier = next
      }
    }
    if (sel.nodeId === 'json-root') {
      if (sel.rowId) {
        traverse(edges.filter((e) => e.source === 'json-root' && e.sourceHandle === `s-${sel.rowId}`), true)
      } else {
        tNodes.add('json-root')
        traverse(edges.filter((e) => e.source === 'json-root'), true)
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
  }, [sel, pendingSource, edges])

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
        }
        if (n.id === 'fields') {
          const values = {}
          for (const e of edges) {
            if (e.target === 'fields' && e.targetHandle) {
              const v = resolver.at('fields', e.targetHandle)
              if (v !== undefined) values[e.targetHandle.slice(2)] = v
            }
          }
          data.values = values
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
        if (n.type === 'ruleOutput') {
          const def = OUTPUT_NODES[n.data.kind]
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
          data.assembled = Object.fromEntries((def?.fields ?? []).map((f) => [f.key, fv[f.key]]))
        }
        if (n.type === 'stringInput') {
          const def = INPUT_NODES[n.data.kind] ?? INPUT_NODES.string_field
          data.params = nodeParams[n.id] ?? {}
          const inEdge = edges.find((e) => e.target === n.id)
          data.wired = !!inEdge
          data.wiredValue = inEdge ? def.coerce(resolver.edgeVal(inEdge, 0), nodeParams[n.id]) : undefined
        }
        return { ...n, data }
      })
    })
  }, [highlighted, handleRowClick, toggleCollapsed, setParam, collapsed, nodeParams, setNodes, jsonData, outputData, edges, makeResolver, nodeSig])

  useEffect(() => {
    if (!nodes.length) return
    try {
      localStorage.setItem(
        GRAPH_KEY,
        JSON.stringify({
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
          nodeParams,
          collapsed: Object.fromEntries(
            Object.entries(collapsed).map(([k, s]) => [k, [...s]]),
          ),
        }),
      )
    } catch {}
  }, [nodes, edges, nodeParams, collapsed, sel, sig])

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
          label={`Linking from “${pendingSource}” — click a field on the right · Esc to cancel`}
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

function Diagnostic({ item }) {
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="body2">
        {item.message}
        {item.line != null && ` — line ${item.line}, column ${item.column}`}
      </Typography>
      {item.snippet != null && (
        <Box
          component="pre"
          sx={{ fontFamily: 'monospace', fontSize: 11, m: 0, mt: 0.25, overflowX: 'auto' }}
        >
          {item.snippet}
          {'\n'}
          {' '.repeat(Math.max(0, (item.column ?? 1) - 1))}^
        </Box>
      )}
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
  const [validation, setValidation] = useState(initial.input)
  const [outputText, setOutputText] = useState(initial.texts.outputText)
  const [outputData, setOutputData] = useState(() =>
    initial.output.ok ? initial.output.value : null,
  )
  const [outputValidation, setOutputValidation] = useState(initial.output)
  const fileInputRef = useRef(null)
  const fileOutputRef = useRef(null)

  const renderJson = useCallback(
    (text, name = 'JSON', outText = null) => {
      const res = validateJson(text)
      setValidation(res)
      setJsonData(res.ok ? { name, value: res.value } : null)
      const oRes = validateJson(outText ?? outputText)
      setOutputValidation(oRes)
      if (oRes.ok) setOutputData(oRes.value)
    },
    [outputText],
  )

  const handleFile = useCallback(
    (file) => {
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const text = String(reader.result)
        setJsonText(text)
        renderJson(text, file.name)
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

  const handleOutputFile = useCallback((file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result)
      setOutputText(text)
      const res = validateJson(text)
      setOutputValidation(res)
      if (res.ok) setOutputData(res.value)
    }
    reader.onerror = () =>
      setOutputValidation({
        ok: false,
        errors: [{ message: 'Could not read the selected file' }],
        warnings: [],
      })
    reader.readAsText(file)
  }, [])

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

  const propCount = jsonData ? toEntries(jsonData.value).length : 0

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
              <Typography variant="subtitle2">JSON input</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <TextField
                multiline
                fullWidth
                minRows={12}
                maxRows={20}
                placeholder="Paste JSON here…"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                spellCheck={false}
                sx={MONO_TEXTFIELD_SX}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ mt: 1 }}
              >
                Browse…
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {validation && !validation.ok && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">Invalid JSON</Typography>
                  {validation.errors.map((e, i) => (
                    <Diagnostic key={i} item={e} />
                  ))}
                </Alert>
              )}
              {validation?.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">
                    {validation.warnings.length === 1
                      ? '1 warning'
                      : `${validation.warnings.length} warnings`}
                  </Typography>
                  {validation.warnings.map((w, i) => (
                    <Diagnostic key={i} item={w} />
                  ))}
                </Alert>
              )}
              {jsonData && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  Loaded “{jsonData.name}” — {propCount}{' '}
                  {propCount === 1 ? 'property' : 'properties'}
                </Alert>
              )}
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters elevation={0} defaultExpanded sx={ACCORDION_SX}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORDION_SUMMARY_SX}>
              <Typography variant="subtitle2">JSON output — structure</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <TextField
                multiline
                fullWidth
                minRows={8}
                maxRows={16}
                placeholder="Output node structure…"
                value={outputText}
                onChange={(e) => setOutputText(e.target.value)}
                spellCheck={false}
                sx={MONO_TEXTFIELD_SX}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadFileIcon />}
                onClick={() => fileOutputRef.current?.click()}
                sx={{ mt: 1 }}
              >
                Browse…
              </Button>
              <input
                ref={fileOutputRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={(e) => handleOutputFile(e.target.files?.[0])}
              />
              {outputValidation && !outputValidation.ok && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">Invalid JSON</Typography>
                  {outputValidation.errors.map((e, i) => (
                    <Diagnostic key={i} item={e} />
                  ))}
                </Alert>
              )}
              {outputValidation?.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">
                    {outputValidation.warnings.length === 1
                      ? '1 warning'
                      : `${outputValidation.warnings.length} warnings`}
                  </Typography>
                  {outputValidation.warnings.map((w, i) => (
                    <Diagnostic key={i} item={w} />
                  ))}
                </Alert>
              )}
            </AccordionDetails>
          </Accordion>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={() => renderJson(jsonText)}
              disabled={!jsonText.trim()}
            >
              Render node
            </Button>
          </Stack>

          <Divider />
          <Accordion disableGutters elevation={0} defaultExpanded sx={ACCORDION_SX}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORDION_SUMMARY_SX}>
              <Typography variant="subtitle2">Transformation nodes</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Drag a rule onto an edge to insert it between input and output.
              </Typography>
              <Stack spacing={1}>
              {TRANSFORM_LIST.map((t) => (
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
              {OUTPUT_NODE_LIST.map((o) => (
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

          <Accordion disableGutters elevation={0} defaultExpanded sx={ACCORDION_SX}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORDION_SUMMARY_SX}>
              <Typography variant="subtitle2">Input nodes</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Drag an input node onto the canvas — its right connector feeds other nodes.
              </Typography>
              <Stack spacing={1}>
              {INPUT_NODE_LIST.map((o) => {
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

          <Accordion disableGutters elevation={0} defaultExpanded sx={ACCORDION_SX}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORDION_SUMMARY_SX}>
              <Typography variant="subtitle2">Debug nodes</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Drag a debug node onto the canvas — its left connector takes any node output.
              </Typography>
              <Stack spacing={1}>
              {DEBUG_NODE_LIST.map((o) => (
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
          <ReactFlowProvider>
            <Canvas
              jsonData={jsonData}
              outputData={outputData}
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
