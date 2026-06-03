"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus, Search, MoreVertical, Trash2, Pencil, X, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface Lead {
  contactId: string;
  name: string;
  phone: string;
  avatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  tags: { name: string; color: string }[];
  assignedTo: string | null;
  createdAt: string;
  conversationId: string | null;
  columnId: string;
  order: number;
  campaignId: string | null;
}
interface Column {
  id: string;
  name: string;
  color: string;
  order: number;
}

export default function PipelinePage() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [agent, setAgent] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuCol, setMenuCol] = useState<string | null>(null);
  const router = useRouter();
  const dragging = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function load() {
    if (dragging.current) return; // não atualiza no meio de um arraste
    const data = await fetch("/api/pipeline").then((r) => r.json());
    setColumns(data.columns);
    setLeads(data.leads);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const agents = useMemo(() => Array.from(new Set(leads.map((l) => l.assignedTo).filter(Boolean))) as string[], [leads]);

  const filtered = leads.filter((l) => {
    const s = search.toLowerCase();
    const okSearch = !s || l.name.toLowerCase().includes(s) || l.phone.includes(search);
    const okAgent = !agent || l.assignedTo === agent;
    return okSearch && okAgent;
  });

  const leadsByCol = (colId: string) =>
    filtered.filter((l) => l.columnId === colId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  function onDragStart(e: DragStartEvent) {
    dragging.current = true;
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    dragging.current = false;
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const contactId = String(active.id);
    const targetCol = String(over.id);
    const lead = leads.find((l) => l.contactId === contactId);
    if (!lead || lead.columnId === targetCol) return;

    // otimista
    setLeads((prev) => prev.map((l) => (l.contactId === contactId ? { ...l, columnId: targetCol } : l)));
    await fetch("/api/pipeline/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, columnId: targetCol, order: Date.now() % 100000 }),
    });
  }

  async function addColumn() {
    await fetch("/api/pipeline/columns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Nova coluna" }) });
    load();
  }
  async function renameColumn(id: string, name: string) {
    setMenuCol(null);
    await fetch(`/api/pipeline/columns/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    load();
  }
  async function deleteColumn(id: string) {
    setMenuCol(null);
    if (!confirm("Excluir esta coluna? Os leads vão para a primeira coluna.")) return;
    await fetch(`/api/pipeline/columns/${id}`, { method: "DELETE" });
    load();
  }

  const activeLead = leads.find((l) => l.contactId === activeId) || null;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Pipeline"
        subtitle="Arraste os leads entre as colunas para mudar o status"
        action={<button className="btn-primary" onClick={addColumn}><Plus className="h-4 w-4" /> Nova coluna</button>}
      />

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-8">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-ink-faint" />
          <input className="bg-transparent text-sm outline-none" placeholder="Buscar nome ou WhatsApp" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input max-w-[200px]" value={agent} onChange={(e) => setAgent(e.target.value)}>
          <option value="">Todos os atendentes</option>
          {agents.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* board */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex flex-1 gap-4 overflow-x-auto px-4 pb-6 sm:px-8">
          {columns.map((col) => (
            <ColumnView
              key={col.id}
              col={col}
              leads={leadsByCol(col.id)}
              menuOpen={menuCol === col.id}
              onToggleMenu={() => setMenuCol(menuCol === col.id ? null : col.id)}
              onRename={renameColumn}
              onDelete={deleteColumn}
              onOpenLead={(l) => l.conversationId && router.push(`/inbox?open=${l.contactId}`)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <CardInner lead={activeLead} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function ColumnView({
  col,
  leads,
  menuOpen,
  onToggleMenu,
  onRename,
  onDelete,
  onOpenLead,
}: {
  col: Column;
  leads: Lead[];
  menuOpen: boolean;
  onToggleMenu: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onOpenLead: (l: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-3 w-3 rounded-full" style={{ background: col.color }} />
        <span className="font-semibold">{col.name}</span>
        <span className="rounded-full bg-gray-100 px-2 text-xs text-ink-soft">{leads.length}</span>
        <div className="relative ml-auto">
          <button onClick={onToggleMenu} className="grid h-7 w-7 place-items-center rounded-lg text-ink-faint hover:bg-gray-100"><MoreVertical className="h-4 w-4" /></button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onToggleMenu} />
              <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-soft">
                <button onClick={() => { const n = prompt("Novo nome da coluna:", col.name); if (n) onRename(col.id, n); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"><Pencil className="h-4 w-4" /> Renomear</button>
                <button onClick={() => onDelete(col.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Excluir</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2 rounded-2xl border-2 border-dashed p-2 transition ${isOver ? "border-brand-400 bg-brand-50/50" : "border-transparent bg-gray-50"}`}
      >
        {leads.map((l) => <DraggableCard key={l.contactId} lead={l} onOpen={() => onOpenLead(l)} />)}
        {leads.length === 0 && <p className="px-2 py-6 text-center text-xs text-ink-faint">Sem leads</p>}
      </div>
    </div>
  );
}

function DraggableCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.contactId });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <CardInner lead={lead} />
    </div>
  );
}

function CardInner({ lead, dragging }: { lead: Lead; dragging?: boolean }) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-white p-3 shadow-card ${dragging ? "w-64 rotate-2" : ""}`}>
      <div className="flex items-center gap-2">
        {lead.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lead.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">{lead.name.charAt(0).toUpperCase()}</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{lead.name}</p>
          <p className="truncate text-xs text-ink-faint">{lead.phone}</p>
        </div>
      </div>
      {lead.lastMessage && (
        <p className="mt-2 flex items-center gap-1 truncate text-xs text-ink-soft"><MessageSquare className="h-3 w-3 shrink-0" /> {lead.lastMessage}</p>
      )}
      {lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.map((t, i) => (
            <span key={i} className="pill !px-2 !py-0.5 !text-[10px]" style={{ background: t.color + "22", color: t.color }}>{t.name}</span>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-[10px] text-ink-faint">
        <span>{lead.assignedTo ? `👤 ${lead.assignedTo}` : "Sem atendente"}</span>
        <span>{formatDate(lead.createdAt)}</span>
      </div>
    </div>
  );
}
