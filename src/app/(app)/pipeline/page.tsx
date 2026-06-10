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
import { Plus, Search, MoreVertical, Trash2, Pencil, X, MessageSquare, Truck, Calendar, DollarSign, Mic, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

// previsão de entrega — lista pronta com cores
const DELIVERY_STATUS = [
  { key: "no_prazo", label: "No prazo", color: "#10B981" },
  { key: "saiu", label: "Saiu pra entrega", color: "#3B82F6" },
  { key: "atrasado", label: "Atrasado", color: "#EF4444" },
  { key: "entregue", label: "Entregue", color: "#22C55E" },
  { key: "devolvido", label: "Devolvido", color: "#6B7280" },
];
const deliveryOf = (key?: string | null) => DELIVERY_STATUS.find((s) => s.key === key);
const brl = (n: number) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  deliveryStatus?: string | null;
  shopeeDate?: string | null;
  orderValue?: number | null;
  commitmentAudioUrl?: string | null;
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
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
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
              onCardMenu={(l) => setDetailsLead(l)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <CardInner lead={activeLead} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {detailsLead && (
        <CardDetailsModal lead={detailsLead} onClose={() => setDetailsLead(null)} onSaved={() => { setDetailsLead(null); load(); }} />
      )}
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
  onCardMenu,
}: {
  col: Column;
  leads: Lead[];
  menuOpen: boolean;
  onToggleMenu: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onOpenLead: (l: Lead) => void;
  onCardMenu: (l: Lead) => void;
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
        {leads.map((l) => <DraggableCard key={l.contactId} lead={l} onOpen={() => onOpenLead(l)} onMenu={() => onCardMenu(l)} />)}
        {leads.length === 0 && <p className="px-2 py-6 text-center text-xs text-ink-faint">Sem leads</p>}
      </div>
    </div>
  );
}

function DraggableCard({ lead, onOpen, onMenu }: { lead: Lead; onOpen: () => void; onMenu: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.contactId });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <CardInner lead={lead} onMenu={onMenu} />
    </div>
  );
}

function CardInner({ lead, dragging, onMenu }: { lead: Lead; dragging?: boolean; onMenu?: () => void }) {
  const delivery = deliveryOf(lead.deliveryStatus);
  return (
    <div className={`relative rounded-xl border border-gray-100 bg-white p-3 shadow-card ${dragging ? "w-64 rotate-2" : ""}`}>
      {/* 3 pontos do card (detalhes do pedido) */}
      {onMenu && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onMenu(); }}
          title="Detalhes do pedido"
          className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-lg text-ink-faint hover:bg-gray-100"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex items-center gap-2 pr-7">
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

      {/* detalhes do pedido (AfterPay) */}
      {(delivery || lead.orderValue != null || lead.shopeeDate || lead.commitmentAudioUrl) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {delivery && (
            <span className="pill !px-2 !py-0.5 !text-[10px]" style={{ background: delivery.color + "22", color: delivery.color }}>
              <Truck className="h-3 w-3" /> {delivery.label}
            </span>
          )}
          {lead.orderValue != null && (
            <span className="pill !px-2 !py-0.5 !text-[10px] bg-emerald-50 text-emerald-600"><DollarSign className="h-3 w-3" /> {brl(lead.orderValue)}</span>
          )}
          {lead.shopeeDate && (
            <span className="pill !px-2 !py-0.5 !text-[10px] bg-gray-100 text-ink-soft"><Calendar className="h-3 w-3" /> {lead.shopeeDate.split("-").reverse().join("/")}</span>
          )}
          {lead.commitmentAudioUrl && (
            <span className="pill !px-2 !py-0.5 !text-[10px] bg-indigo-50 text-indigo-600"><Mic className="h-3 w-3" /> comprovante</span>
          )}
        </div>
      )}

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

// Modal de detalhes do pedido (previsão de entrega, data Shopee, valor/promo, áudio de compromisso)
function CardDetailsModal({ lead, onClose, onSaved }: { lead: Lead; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<string>(lead.deliveryStatus || "");
  const [shopeeDate, setShopeeDate] = useState<string>(lead.shopeeDate || "");
  const [orderValue, setOrderValue] = useState<string>(lead.orderValue != null ? String(lead.orderValue) : "");
  const [audioUrl, setAudioUrl] = useState<string>(lead.commitmentAudioUrl || "");
  const [clientAudios, setClientAudios] = useState<{ url: string; at: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/pipeline/card/${lead.contactId}`).then((r) => r.json()).then((d) => setClientAudios(d.clientAudios || []));
  }, [lead.contactId]);

  async function save() {
    setSaving(true);
    await fetch(`/api/pipeline/card/${lead.contactId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryStatus: status || null,
        shopeeDate: shopeeDate || null,
        orderValue: orderValue === "" ? null : Number(orderValue.replace(",", ".")),
        commitmentAudioUrl: audioUrl || null,
      }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Detalhes do pedido</h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-sm text-ink-soft">{lead.name} • {lead.phone}</p>

        {/* previsão de entrega (tags de cores) */}
        <label className="mb-1 block text-xs font-semibold text-ink-soft">Previsão de entrega</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {DELIVERY_STATUS.map((s) => (
            <button key={s.key} onClick={() => setStatus(status === s.key ? "" : s.key)}
              className="pill !px-3 !py-1.5 !text-xs border transition"
              style={status === s.key ? { background: s.color, color: "#fff", borderColor: s.color } : { background: s.color + "1a", color: s.color, borderColor: "transparent" }}>
              <Truck className="h-3.5 w-3.5" /> {s.label}
            </button>
          ))}
        </div>

        {/* data da Shopee */}
        <label className="mb-1 block text-xs font-semibold text-ink-soft">Data que a Shopee deu (entrega)</label>
        <input type="date" value={shopeeDate} onChange={(e) => setShopeeDate(e.target.value)} className="input mb-4" />

        {/* valor do pedido (com promo) */}
        <label className="mb-1 block text-xs font-semibold text-ink-soft">Valor do pedido (R$) — aceita promoção</label>
        <input type="number" step="0.01" min="0" inputMode="decimal" value={orderValue} onChange={(e) => setOrderValue(e.target.value)} placeholder="0,00" className="input mb-4" />

        {/* áudio de compromisso de pagamento (do cliente) */}
        <label className="mb-1 block text-xs font-semibold text-ink-soft">Áudio de compromisso de pagamento (do cliente)</label>
        {clientAudios.length === 0 ? (
          <p className="mb-4 flex items-center gap-1 text-xs text-ink-faint"><MessageSquareText className="h-3.5 w-3.5" /> Nenhum áudio recebido deste contato ainda.</p>
        ) : (
          <div className="mb-4 space-y-2">
            {clientAudios.map((a) => (
              <label key={a.url} className={`flex items-center gap-2 rounded-xl border p-2 ${audioUrl === a.url ? "border-indigo-400 bg-indigo-50" : "border-gray-200"}`}>
                <input type="radio" name="audio" checked={audioUrl === a.url} onChange={() => setAudioUrl(audioUrl === a.url ? "" : a.url)} />
                <audio src={a.url} controls className="h-8 w-full" />
              </label>
            ))}
            <p className="text-[11px] text-ink-faint">Marcar um áudio aplica a tag “💰 Comprometeu pagar” no contato.</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}
