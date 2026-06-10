"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, Package, Truck, DollarSign, TrendingUp, TrendingDown, Users, ShoppingCart, Percent, Target, Boxes, Send, Clock, AlertTriangle } from "lucide-react";

const PERIODS = [
  { key: "hoje", label: "Hoje" },
  { key: "7d", label: "7d" },
  { key: "15d", label: "15d" },
  { key: "30d", label: "30d" },
  { key: "tudo", label: "Tudo" },
];

const brl = (n: number) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Config = { trafficSpend: number; productPrice: number; productCost: number; shippingCost: number; shippedQty: number };
type Metrics = {
  leads: number; vendas: number; receita: number; custoProduto: number; custoFrete: number;
  custoTotal: number; lucro: number; roas: number; cpl: number; cpa: number; ticketMedio: number; margem: number; taxaConversao: number;
  enviados: number; gastoProdutoEnviado: number; gastoFreteEnviado: number; investidoLogistica: number; aguardandoPagto: number; valorEmRisco: number;
};

export default function FinancePage() {
  const [period, setPeriod] = useState("30d");
  const [config, setConfig] = useState<Config>({ trafficSpend: 0, productPrice: 0, productCost: 0, shippingCost: 0, shippedQty: 0 });
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/finance?period=${period}`).then((x) => x.json());
    setConfig(r.config);
    setMetrics(r.metrics);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  async function saveField(key: keyof Config, value: string) {
    setSaving(true);
    const num = Number(value.replace(",", ".")) || 0;
    setConfig((c) => ({ ...c, [key]: num }));
    await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: num }) });
    await load();
    setSaving(false);
  }

  const lucroPos = (metrics?.lucro ?? 0) >= 0;

  return (
    <div className="pb-12">
      <div className="px-4 pt-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="mt-1 text-sm text-ink-faint">Gestão de tráfego, produto e frete {saving && "• salvando…"}</p>
          </div>
          <div className="ml-auto inline-flex rounded-full border border-gray-200 bg-white p-1">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${p.key === period ? "bg-brand-400 text-white" : "text-ink-soft hover:bg-gray-50"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Entradas de custo */}
        <section className="mt-8">
          <h3 className="mb-4 text-lg font-semibold">Custos e valores <span className="text-sm font-normal text-ink-faint">• edite e salva sozinho</span></h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CostInput icon={<Megaphone className="h-5 w-5" />} accent="#9A7BFF" label="Gasto com tráfego" hint="total investido em anúncios" value={config.trafficSpend} onSave={(v) => saveField("trafficSpend", v)} />
            <CostInput icon={<DollarSign className="h-5 w-5" />} accent="#10B981" label="Valor do produto" hint="preço de venda (por unidade)" value={config.productPrice} onSave={(v) => saveField("productPrice", v)} />
            <CostInput icon={<Package className="h-5 w-5" />} accent="#F59E0B" label="Custo do produto" hint="quanto você paga por unidade" value={config.productCost} onSave={(v) => saveField("productCost", v)} />
            <CostInput icon={<Truck className="h-5 w-5" />} accent="#3FC8E4" label="Frete" hint="custo de envio (por venda)" value={config.shippingCost} onSave={(v) => saveField("shippingCost", v)} />
          </div>
        </section>

        {/* Resultado */}
        <section className="mt-10">
          <h3 className="mb-4 text-lg font-semibold">Resultado</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <BigCard label="Receita" value={brl(metrics?.receita ?? 0)} sub={`${metrics?.vendas ?? 0} venda(s) × ${brl(config.productPrice)}`} accent="#10B981" icon={<DollarSign className="h-5 w-5" />} />
            <BigCard label="Custo total" value={brl(metrics?.custoTotal ?? 0)} sub="tráfego + produto + frete" accent="#EF4444" icon={<TrendingDown className="h-5 w-5" />} />
            <BigCard
              label="Lucro"
              value={brl(metrics?.lucro ?? 0)}
              sub={`margem ${(metrics?.margem ?? 0).toFixed(0)}%`}
              accent={lucroPos ? "#10B981" : "#EF4444"}
              icon={lucroPos ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              big
            />
          </div>
        </section>

        {/* Envios (AfterPay / pagamento na entrega) */}
        <section className="mt-10">
          <h3 className="mb-1 text-lg font-semibold">Envios (AfterPay / pagamento na entrega)</h3>
          <p className="mb-4 text-xs text-ink-faint">No AfterPay você gasta com produto + frete <b>na hora do envio</b>, antes de receber. Aqui você vê quanto já saiu do caixa.</p>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CostInput icon={<Boxes className="h-5 w-5" />} accent="#6366F1" label="Qtd. enviada" hint="deixe 0 = puxa os Agendados/Enviados do pipeline" value={config.shippedQty} onSave={(v) => saveField("shippedQty", v)} unit="" />
            <BigCard label="Produtos enviados" value={String(metrics?.enviados ?? 0)} sub="total despachado" accent="#6366F1" icon={<Send className="h-5 w-5" />} />
            <BigCard label="Aguardando pagamento" value={String(metrics?.aguardandoPagto ?? 0)} sub="enviados que não pagaram" accent="#F59E0B" icon={<Clock className="h-5 w-5" />} />
            <BigCard label="Valor em risco" value={brl(metrics?.valorEmRisco ?? 0)} sub="produto+frete dos não pagos" accent="#EF4444" icon={<AlertTriangle className="h-5 w-5" />} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <BigCard label="Gasto comprando produto" value={brl(metrics?.gastoProdutoEnviado ?? 0)} sub={`${metrics?.enviados ?? 0} × ${brl(config.productCost)}`} accent="#F59E0B" icon={<Package className="h-5 w-5" />} />
            <BigCard label="Gasto com frete (envios)" value={brl(metrics?.gastoFreteEnviado ?? 0)} sub={`${metrics?.enviados ?? 0} × ${brl(config.shippingCost)}`} accent="#3FC8E4" icon={<Truck className="h-5 w-5" />} />
            <BigCard label="Total investido em envios" value={brl(metrics?.investidoLogistica ?? 0)} sub="caixa que já saiu" accent="#EF4444" icon={<TrendingDown className="h-5 w-5" />} big />
          </div>
        </section>

        {/* Indicadores */}
        <section className="mt-8">
          <h3 className="mb-4 text-lg font-semibold">Indicadores</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Mini icon={<Users className="h-4 w-4" />} label="Leads" value={String(metrics?.leads ?? 0)} />
            <Mini icon={<ShoppingCart className="h-4 w-4" />} label="Vendas" value={String(metrics?.vendas ?? 0)} />
            <Mini icon={<Percent className="h-4 w-4" />} label="Conversão" value={`${(metrics?.taxaConversao ?? 0).toFixed(1)}%`} />
            <Mini icon={<Target className="h-4 w-4" />} label="ROAS" value={`${(metrics?.roas ?? 0).toFixed(2)}x`} hint="receita ÷ tráfego" />
            <Mini icon={<DollarSign className="h-4 w-4" />} label="Custo/lead" value={brl(metrics?.cpl ?? 0)} />
            <Mini icon={<DollarSign className="h-4 w-4" />} label="Custo/venda" value={brl(metrics?.cpa ?? 0)} />
          </div>
        </section>

        {/* Detalhe dos custos */}
        <section className="mt-8">
          <div className="card p-6">
            <h4 className="mb-3 text-sm font-semibold text-ink-soft">Quebra dos custos no período</h4>
            <Row label="Tráfego (anúncios)" value={brl(config.trafficSpend)} />
            <Row label={`Produto (${metrics?.vendas ?? 0} × ${brl(config.productCost)})`} value={brl(metrics?.custoProduto ?? 0)} />
            <Row label={`Frete (${metrics?.vendas ?? 0} × ${brl(config.shippingCost)})`} value={brl(metrics?.custoFrete ?? 0)} />
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 font-semibold">
              <span>Custo total</span><span>{brl(metrics?.custoTotal ?? 0)}</span>
            </div>
            <div className={`mt-1 flex items-center justify-between font-bold ${lucroPos ? "text-emerald-600" : "text-red-600"}`}>
              <span>Lucro</span><span>{brl(metrics?.lucro ?? 0)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function CostInput({ icon, accent, label, hint, value, onSave, unit = "R$" }: { icon: React.ReactNode; accent: string; label: string; hint: string; value: number; onSave: (v: string) => void; unit?: string }) {
  const [local, setLocal] = useState(String(value ?? 0));
  useEffect(() => { setLocal(String(value ?? 0)); }, [value]);
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full" style={{ backgroundColor: `${accent}1a`, color: accent }}>{icon}</span>
        <div>
          <p className="text-sm font-medium text-ink">{label}</p>
          <p className="text-[11px] text-ink-faint">{hint}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-brand-400">
        {unit && <span className="text-sm text-ink-faint">{unit}</span>}
        <input
          type="number" inputMode="decimal" step="0.01" min="0"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => onSave(local)}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-full bg-transparent text-lg font-bold outline-none"
        />
      </div>
    </div>
  );
}

function BigCard({ icon, accent, label, value, sub, big }: { icon: React.ReactNode; accent: string; label: string; value: string; sub: string; big?: boolean }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-full" style={{ backgroundColor: `${accent}1a`, color: accent }}>{icon}</span>
      </div>
      <p className={`mt-3 font-bold ${big ? "text-4xl" : "text-3xl"}`} style={{ color: accent }}>{value}</p>
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="text-xs text-ink-faint">{sub}</p>
    </div>
  );
}

function Mini({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-ink-faint">{icon}<span className="text-xs">{label}</span></div>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {hint && <p className="text-[10px] text-ink-faint">{hint}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-ink-soft">{label}</span><span className="font-medium">{value}</span>
    </div>
  );
}
