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
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import JsonNode, { toEntries } from './JsonNode.jsx'
import TransformNode from './TransformNode.jsx'
import { validateJson } from './validateJson.js'
import sampleInputText from '../sample_json.json?raw'
import sampleOutputText from '../sample_output.json?raw'

const nodeTypes = { jsonNode: JsonNode, transform: TransformNode }

const TRANSFORMS = {
  unix_to_iso: {
    label: 'Transform to ISO time',
    description: 'Unix seconds → ISO 8601',
    apply: (v) => {
      const n = Number(v)
      return Number.isFinite(n) ? new Date(n * 1000).toISOString() : null
    },
  },
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

function Canvas({ jsonData, outputData }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [pendingSource, setPendingSource] = useState(null)
  const [sel, setSel] = useState(null)
  const [dropEdgeId, setDropEdgeId] = useState(null)
  const txIdRef = useRef(0)
  const { fitView, screenToFlowPosition } = useReactFlow()

  const upsertEdge = useCallback(
    (conn, eds) => {
      const filtered = eds.filter(
        (e) => !(e.target === conn.target && e.targetHandle === conn.targetHandle),
      )
      return addEdge({ ...conn, style: EDGE_STYLE }, filtered)
    },
    [],
  )

  const onConnect = useCallback(
    (conn) => setEdges((eds) => upsertEdge(conn, eds)),
    [setEdges, upsertEdge],
  )

  const onReconnect = useCallback(
    (oldEdge, conn) =>
      setEdges((eds) =>
        reconnectEdge(oldEdge, conn, eds, {
          shouldReplaceId: true,
        }).filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i),
      ),
    [setEdges],
  )

  const handleRowClick = useCallback(
    (nodeId, rowId) => {
      if (nodeId === 'json-root') {
        setPendingSource((p) => (p === rowId ? null : rowId))
        setSel((s) =>
          s?.nodeId === nodeId && s.rowId === rowId ? null : { nodeId, rowId },
        )
      } else if (nodeId === 'fields') {
        if (pendingSource) {
          setEdges((eds) =>
            upsertEdge(
              {
                id: `e-${pendingSource}-${rowId}`,
                source: 'json-root',
                sourceHandle: `s-${pendingSource}`,
                target: 'fields',
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

  const onPaneClick = useCallback(() => {
    setPendingSource(null)
    setSel(null)
  }, [])

  const onNodeClick = useCallback((_, node) => {
    if (node.type === 'transform') setSel({ nodeId: node.id })
  }, [])

  const resolveValue = useCallback((target, targetHandle, eds, inputObj, tNodes) => {
    const transforms = []
    let cur = eds.find((e) => e.target === target && e.targetHandle === targetHandle)
    for (let i = 0; i < 12 && cur; i++) {
      if (cur.source === 'json-root') {
        let val = inputObj?.[cur.sourceHandle?.slice(2)]
        for (let j = transforms.length - 1; j >= 0; j--) val = transforms[j](val)
        return val
      }
      const tn = tNodes[cur.source]
      if (!tn) return undefined
      transforms.push(TRANSFORMS[tn.data.transformId]?.apply ?? ((v) => v))
      cur = eds.find((e) => e.target === cur.source)
    }
    return undefined
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
          data: { label: t.label, transformId: type },
        },
      ])
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

  const onBeforeDelete = useCallback(
    ({ nodes: dNodes }) => {
      if (!dNodes.some((n) => n.type === 'transform')) return true
      setEdges((eds) => {
        let next = eds
        for (const n of dNodes.filter((n) => n.type === 'transform')) {
          const inE = next.find((e) => e.target === n.id)
          const outE = next.find((e) => e.source === n.id)
          next = next.filter((e) => e !== inE && e !== outE)
          if (inE && outE) {
            next = addEdge(
              {
                id: `e-${inE.sourceHandle?.slice(2)}-${outE.targetHandle?.slice(2)}`,
                source: inE.source,
                sourceHandle: inE.sourceHandle,
                target: outE.target,
                targetHandle: outE.targetHandle,
                style: EDGE_STYLE,
              },
              next,
            )
          }
        }
        return next
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
    if (!type) return
    const edge = edges.find((x) => x.id === edgeAtPoint(e))
    insertTransform(type, edge, screenToFlowPosition({ x: e.clientX, y: e.clientY }))
  }

  useEffect(() => {
    if (!pendingSource && !sel) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setPendingSource(null)
        setSel(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingSource, sel])

  useEffect(() => {
    const nodes = [
      {
        id: 'fields',
        type: 'jsonNode',
        position: { x: 620, y: 60 },
        data: { name: 'output', value: outputData ?? {} },
      },
    ]
    const edges = []
    if (jsonData) {
      nodes.unshift({
        id: 'json-root',
        type: 'jsonNode',
        position: { x: 60, y: 60 },
        data: { name: jsonData.name, value: jsonData.value },
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
    setNodes(nodes)
    setEdges(edges)
    setPendingSource(null)
    setSel(null)
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }))
  }, [jsonData, outputData, setNodes, setEdges, fitView])

  const highlighted = useMemo(() => {
    const rows = { 'json-root': new Set(), fields: new Set() }
    const tNodes = new Set()
    const edgeIds = new Set()
    if (pendingSource) rows['json-root'].add(pendingSource)
    if (!sel) return { rows, tNodes, edgeIds }

    rows[sel.nodeId]?.add(sel.rowId)
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
      traverse(edges.filter((e) => e.source === 'json-root' && e.sourceHandle === `s-${sel.rowId}`), true)
    } else if (sel.nodeId === 'fields') {
      traverse(edges.filter((e) => e.target === 'fields' && e.targetHandle === `t-${sel.rowId}`), false)
    } else {
      tNodes.add(sel.nodeId)
      traverse(edges.filter((e) => e.source === sel.nodeId), true)
      traverse(edges.filter((e) => e.target === sel.nodeId), false)
    }
    return { rows, tNodes, edgeIds }
  }, [sel, pendingSource, edges])

  const displayEdges = useMemo(() => {
    const inactive = !sel && !pendingSource && !dropEdgeId
    return edges.map((e) => {
      if (dropEdgeId) {
        return e.id === dropEdgeId
          ? { ...e, style: EDGE_DROP_STYLE, animated: true }
          : { ...e, style: EDGE_DIM_STYLE }
      }
      if (e.selected) return { ...e, style: EDGE_SELECTED_STYLE, animated: true }
      if (inactive) return e
      const linked = highlighted.edgeIds.has(e.id)
      return { ...e, style: linked ? EDGE_HI_STYLE : sel || pendingSource ? EDGE_DIM_STYLE : EDGE_STYLE }
    })
  }, [edges, sel, pendingSource, dropEdgeId, highlighted])

  useEffect(() => {
    const inputObj = jsonData?.value
    setNodes((ns) => {
      const tNodeMap = Object.fromEntries(
        ns.filter((n) => n.type === 'transform').map((n) => [n.id, n]),
      )
      return ns.map((n) => {
        const data = {
          ...n.data,
          onRowClick: (rowId) => handleRowClick(n.id, rowId),
          selectedIds: [...(highlighted.rows[n.id] ?? [])],
          highlighted: highlighted.tNodes.has(n.id),
        }
        if (n.id === 'fields') {
          const values = {}
          for (const e of edges) {
            if (e.target === 'fields' && e.targetHandle) {
              const v = resolveValue('fields', e.targetHandle, edges, inputObj, tNodeMap)
              if (v !== undefined) values[e.targetHandle.slice(2)] = v
            }
          }
          data.values = values
        }
        if (n.type === 'transform') {
          const v = resolveValue(n.id, 'in', edges, inputObj, tNodeMap)
          const out = v === undefined ? undefined : TRANSFORMS[n.data.transformId]?.apply(v)
          data.preview = out == null ? null : String(out)
        }
        return { ...n, data }
      })
    })
  }, [highlighted, handleRowClick, setNodes, jsonData, edges, resolveValue])

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

const SAMPLE_INPUT = validateJson(sampleInputText)
const SAMPLE_OUTPUT = validateJson(sampleOutputText)

const ACCORDION_SX = { bgcolor: 'transparent', '&::before': { display: 'none' } }
const ACCORDION_SUMMARY_SX = { px: 0, minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }
const MONO_TEXTFIELD_SX = { '& textarea': { fontFamily: 'monospace', fontSize: 12 } }

function App() {
  const [jsonText, setJsonText] = useState(sampleInputText)
  const [jsonData, setJsonData] = useState(() =>
    SAMPLE_INPUT.ok ? { name: 'sample.json', value: SAMPLE_INPUT.value } : null,
  )
  const [validation, setValidation] = useState(() => SAMPLE_INPUT)
  const [outputText, setOutputText] = useState(sampleOutputText)
  const [outputData, setOutputData] = useState(() =>
    SAMPLE_OUTPUT.ok ? SAMPLE_OUTPUT.value : null,
  )
  const [outputValidation, setOutputValidation] = useState(() => SAMPLE_OUTPUT)
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
              {Object.entries(TRANSFORMS).map(([id, t]) => (
                <Paper
                  key={id}
                  variant="outlined"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-transform-node', id)
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
                to rewire it.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ReactFlowProvider>
            <Canvas jsonData={jsonData} outputData={outputData} />
          </ReactFlowProvider>
        </Box>
      </Box>
    </Box>
  )
}

export default App
