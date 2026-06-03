"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Plug, RefreshCw, Truck, Loader2 } from "lucide-react";
import { PageHeader, Badge } from "@/components/ui";

interface Order {
  orderSn: string;
  status: string;
  buyer: string;
  total: number;
  currency: string;
  createTime: number;
  items: { name: string; qty: number }[];
  recipient?: string;
  payment?: string;
}

const STATUSES = ["", "UNPAID", "READY_TO_SHIP", "PROCESSED", "SHIPPED", "COMPLETED", "CANCELLED", "TO_RETURN"];
const statusColor: Record<string, any> = {
  UNPAID: "yellow", READY_TO_SHIP: "blue", PROCESSED: "blue", SHIPPED: "purple",
  COMPLETED: "green", CANCELLED: "red", IN_CANCEL: "red", TO_RETURN: "yellow",
};

export default function OrdersPage() {
  const [cfg, setCfg] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ partnerId: "", partnerKey: "" });

  async function loadCfg() {
    const c = await fetch("/api/shopee/config").then((r) => r.json());
    setCfg(c);
    setForm((f) => ({ ...f, partnerId: c.partnerId || "" }));
    return c;
  }

  async function loadOrders() {
    setLoading(true);
    setErr("");
    const d = await fetch(`/api/shopee/orders?status=${status}`).then((r) => r.json());
    if (d.error) setErr(d.error);
    setOrders(d.orders || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCfg().then((c) => { if (c.authorized) loadOrders(); });
    // feedback do callback
    const q = new URLSearchParams(window.location.search).get("shopee");
    if (q === "ok") setTimeout(() => loadCfg().then((c) => c.authorized && loadOrders()), 500);
  }, []);

  useEffect(() => { if (cfg?.authorized) loadOrders(); /* eslint-disable-next-line */ }, [status]);

  async function saveCfg() {
    await fetch("/api/shopee/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    loadCfg();
  }
  async function connect() {
    const d = await fetch("/api/shopee/auth-url").then((r) => r.json());
    if (d.url) window.location.href = d.url;
    else alert(d.error || "Erro ao gerar URL");
  }
  async function loadTracking(sn: string) {
    setTracking((t) => ({ ...t, [sn]: "..." }));
    const d = await fetch(`/api/shopee/tracking?order_sn=${sn}`).then((r) => r.json());
    setTracking((t) => ({ ...t, [sn]: d.tracking || "—" }));
  }

  if (!cfg) return <div className="p-8 text-ink-faint">Carregando...</div>;

  return (
    <div className="pb-12">
      <PageHeader
        title="Pedidos"
        subtitle="Pedidos da sua loja Shopee"
        action={cfg.authorized ? <button className="btn-ghost" onClick={loadOrders}><RefreshCw className="h-4 w-4" /> Atualizar</button> : undefined}
      />

      <div className="px-4 sm:px-8">
        {/* Não configurado/autorizado */}
        {!cfg.authorized ? (
          <div className="card max-w-xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <Plug className="h-5 w-5 text-brand-500" />
              <h3 className="font-semibold">Conectar Shopee</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">Partner ID</label>
                <input className="input font-mono text-sm" value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">Partner Key</label>
                <input className="input font-mono text-sm" placeholder={cfg.partnerKey || "sua partner_key"} value={form.partnerKey} onChange={(e) => setForm({ ...form, partnerKey: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={saveCfg}>Salvar credenciais</button>
                <button className="btn-primary" onClick={connect} disabled={!cfg.configured}>
                  <ShoppingBag className="h-4 w-4" /> Autorizar loja
                </button>
              </div>
              <p className="text-xs text-ink-faint">
                1) Salve o Partner ID + Partner Key (da Shopee Open Platform). 2) Clique em "Autorizar loja" → você é levado pro Shopee pra autorizar → volta conectado.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <select className="input max-w-[220px]" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s || "Todos os status"}</option>)}
              </select>
              <Badge color="green">Loja conectada</Badge>
            </div>

            {err && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{err}</div>}

            <div className="card overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-ink-faint">
                    <th className="px-4 py-3 font-medium">Pedido</th>
                    <th className="px-4 py-3 font-medium">Comprador</th>
                    <th className="px-4 py-3 font-medium">Itens</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Rastreio</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-faint"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
                  {!loading && orders.map((o) => (
                    <tr key={o.orderSn} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{o.orderSn}</td>
                      <td className="px-4 py-3">{o.buyer || o.recipient || "—"}</td>
                      <td className="px-4 py-3 text-ink-soft">{o.items.map((i) => `${i.qty}x ${i.name}`).join(", ").slice(0, 40) || "—"}</td>
                      <td className="px-4 py-3">{o.currency} {o.total}</td>
                      <td className="px-4 py-3"><Badge color={statusColor[o.status] || "gray"}>{o.status}</Badge></td>
                      <td className="px-4 py-3">
                        {tracking[o.orderSn] ? (
                          <span className="font-mono text-xs">{tracking[o.orderSn]}</span>
                        ) : (
                          <button className="flex items-center gap-1 text-xs text-brand-500 hover:underline" onClick={() => loadTracking(o.orderSn)}>
                            <Truck className="h-3.5 w-3.5" /> Ver rastreio
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && orders.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-faint">Nenhum pedido (últimos 15 dias).</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
