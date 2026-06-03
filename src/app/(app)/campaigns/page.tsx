"use client";

import { useEffect, useState } from "react";
import { Plus, Download, QrCode, Link2, X, Copy } from "lucide-react";
import { PageHeader } from "@/components/ui";
import type { Campaign } from "@/lib/types";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [flows, setFlows] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [qrFor, setQrFor] = useState<Campaign | null>(null);

  async function load() {
    const [c, m] = await Promise.all([
      fetch("/api/campaigns").then((r) => r.json()),
      fetch("/api/meta").then((r) => r.json()),
    ]);
    setCampaigns(c);
    setFlows(m.flows);
  }
  useEffect(() => {
    load();
  }, []);

  const linkFor = (c: Campaign) =>
    typeof window !== "undefined" ? `${window.location.origin}/c/${c.slug}` : `/c/${c.slug}`;

  return (
    <div className="pb-12">
      <PageHeader
        title="Campanhas"
        action={
          <div className="flex gap-2">
            <button className="btn-ghost"><Download className="h-4 w-4" /> Baixe Relatório</button>
            <button className="btn-green" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Criar Nova Campanha</button>
          </div>
        }
      />

      <div className="px-4 sm:px-8">
        <p className="pb-3 text-sm text-ink-faint">Todas as Campanhas</p>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-ink-faint">
                <th className="px-6 py-3 font-medium">Campanha</th>
                <th className="px-6 py-3 font-medium">Participantes</th>
                <th className="px-6 py-3 font-medium">Execuções</th>
                <th className="px-6 py-3 font-medium">CTR %</th>
                <th className="px-6 py-3 font-medium"></th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-ink-faint">{flows.find((f) => f.id === c.flowId)?.name ?? "Sem fluxo vinculado"}</p>
                  </td>
                  <td className="px-6 py-4">{c.participants}</td>
                  <td className="px-6 py-4">{c.executions}</td>
                  <td className="px-6 py-4">{c.ctr}</td>
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-1 text-brand-500 hover:underline" onClick={() => setQrFor(c)}>
                      <QrCode className="h-4 w-4" /> Mostrar QR
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-1 text-brand-500 hover:underline" onClick={() => { navigator.clipboard.writeText(linkFor(c)); }}>
                      <Link2 className="h-4 w-4" /> Copiar Link
                    </button>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-ink-faint">Nenhuma campanha ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && <CreateCampaignModal flows={flows} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); load(); }} />}
      {qrFor && <QrModal campaign={qrFor} link={linkFor(qrFor)} onClose={() => setQrFor(null)} />}
    </div>
  );
}

function CreateCampaignModal({ flows, onClose, onCreated }: { flows: { id: string; name: string }[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", flowId: "", description: "" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Criar Campanha</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-ink-faint" /></button>
        </div>
        <div className="space-y-3">
          <input className="input" placeholder="Nome da campanha" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <textarea className="input" placeholder="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Fluxo iniciado automaticamente</label>
            <select className="input" value={form.flowId} onChange={(e) => setForm({ ...form, flowId: e.target.value })}>
              <option value="">Nenhum</option>
              {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={saving || !form.name} onClick={submit}>Criar</button>
        </div>
      </div>
    </div>
  );
}

function QrModal({ campaign, link, onClose }: { campaign: Campaign; link: string; onClose: () => void }) {
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(link)}`;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{campaign.name}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-ink-faint" /></button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR Code" className="mx-auto rounded-xl border border-gray-100" />
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 p-2 text-xs">
          <span className="truncate text-ink-soft">{link}</span>
          <button className="ml-auto text-brand-500" onClick={() => navigator.clipboard.writeText(link)}><Copy className="h-4 w-4" /></button>
        </div>
        <p className="mt-3 text-xs text-ink-faint">Ao entrar por este link, o lead é salvo com a campanha de origem e o fluxo é iniciado automaticamente.</p>
      </div>
    </div>
  );
}
