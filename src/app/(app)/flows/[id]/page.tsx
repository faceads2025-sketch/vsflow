"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  MarkerType,
} from "reactflow";
import * as Icons from "lucide-react";
import { ArrowLeft, Save, Play, Plus, X } from "lucide-react";
import FlowNode from "@/components/flow/FlowNode";
import Inspector from "@/components/flow/Inspector";
import { MENU_ITEMS, BLOCKS, blockByType } from "@/components/flow/blocks";
import type { FlowNodeType } from "@/lib/types";

export default function FlowBuilder() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const nodeTypes = useMemo(() => Object.fromEntries(BLOCKS.map((b) => [b.type, FlowNode])), []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("draft");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [runLog, setRunLog] = useState<string[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    fetch(`/api/flows/${id}`).then((r) => r.json()).then((flow) => {
      setName(flow.name);
      setStatus(flow.status);
      setNodes(flow.nodes.map((n: any) => ({ id: n.id, type: n.type, position: n.position, data: n.data })));
      setEdges(
        flow.edges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          label: e.label,
          markerEnd: { type: MarkerType.ArrowClosed },
        })),
      );
    });
  }, [id, setNodes, setEdges]);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges],
  );

  const addBlock = (type: FlowNodeType) => {
    const meta = blockByType(type);
    const newId = `${type}_${Math.floor(performance.now())}`;
    setNodes((nds) => [
      ...nds,
      { id: newId, type, position: { x: 240 + Math.random() * 120, y: 120 + nds.length * 40 }, data: { ...meta.defaultData } },
    ]);
    setSelectedId(newId);
    setMenuOpen(false);
  };

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const updateSelected = (data: any) => {
    setNodes((nds) => nds.map((n) => (n.id === selectedId ? { ...n, data } : n)));
  };

  const deleteSelected = () => {
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  };

  async function save(publish = false) {
    setSaving(true);
    const newStatus = publish ? "published" : status;
    await fetch(`/api/flows/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        status: newStatus,
        nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, label: e.label })),
      }),
    });
    setStatus(newStatus);
    setSaving(false);
    showToast(publish ? "Fluxo publicado! ✅" : "Fluxo salvo! ✅");
  }

  async function testRun() {
    await save();
    const res = await fetch(`/api/flows/${id}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json());
    setRunLog(res.run?.steps?.map((s: any) => s.action) ?? []);
  }

  return (
    <div className="flex h-full flex-col">
      {/* toast de confirmação */}
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-soft">
          {toast}
        </div>
      )}

      {/* topbar */}
      <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-3 py-2 sm:gap-3 sm:px-5 sm:py-3">
        <button onClick={() => router.push("/flows")} className="shrink-0 text-ink-soft hover:text-ink"><ArrowLeft className="h-5 w-5" /></button>
        <input className="min-w-0 flex-1 rounded-lg px-2 py-1 text-base font-semibold outline-none hover:bg-gray-50 focus:bg-gray-50 sm:flex-none sm:text-lg" value={name} onChange={(e) => setName(e.target.value)} />
        <span className={`pill hidden sm:inline-flex ${status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{status === "published" ? "Publicado" : "Rascunho"}</span>
        <div className="ml-auto flex shrink-0 gap-1.5 sm:gap-2">
          <button className="btn-ghost !px-3" onClick={testRun} title="Testar"><Play className="h-4 w-4" /> <span className="hidden sm:inline">Testar</span></button>
          <button className="btn-ghost !px-3" disabled={saving} onClick={() => save(false)} title="Salvar"><Save className="h-4 w-4" /> <span className="hidden sm:inline">Salvar</span></button>
          <button className="btn-primary !px-3" disabled={saving} onClick={() => save(true)}>Publicar</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* canvas (sem barra lateral de blocos) */}
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => { setSelectedId(null); setMenuOpen(false); }}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} color="#e5e7eb" />
            <Controls />
            <MiniMap pannable zoomable className="!bg-white" />
          </ReactFlow>

          {/* menu flutuante "+" (canto superior direito) */}
          <div className="absolute right-6 top-6 z-10 flex flex-col items-end gap-3">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-14 w-14 place-items-center rounded-full bg-brand-400 text-white shadow-soft transition hover:bg-brand-500"
              aria-label="Adicionar bloco"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </button>

            {menuOpen && (
              <div className="w-60 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 shadow-soft">
                {MENU_ITEMS.map((item) => {
                  const Icon = (Icons as any)[item.icon] ?? Icons.Circle;
                  return (
                    <button
                      key={item.label}
                      onClick={() => addBlock(item.type)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-gray-50"
                    >
                      <Icon className="h-5 w-5" style={{ color: item.color }} />
                      <span className="flex-1">{item.label}</span>
                      {item.pro && (
                        <span className="rounded-md bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Pro</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {runLog && (
            <div className="absolute bottom-6 left-6 z-10 max-w-sm rounded-2xl bg-gray-900 p-4 text-xs text-white shadow-soft">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">Simulação do fluxo</p>
                <button onClick={() => setRunLog(null)} className="opacity-60 hover:opacity-100">×</button>
              </div>
              {runLog.length === 0 ? <p>Sem passos.</p> : runLog.map((l, i) => <p key={i} className="text-white/80">• {l}</p>)}
            </div>
          )}
        </div>

        {/* inspector — aparece só ao selecionar um bloco, some ao clicar fora */}
        {selected && <Inspector node={selected} onChange={updateSelected} onDelete={deleteSelected} onClose={() => setSelectedId(null)} />}
      </div>
    </div>
  );
}
