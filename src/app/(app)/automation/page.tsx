"use client";

import { useEffect, useState } from "react";
import { Plus, Tag as TagIcon, Webhook as WebhookIcon, ListOrdered, X, Clock } from "lucide-react";
import { PageHeader, Badge } from "@/components/ui";
import type { Keyword, Sequence, Webhook } from "@/lib/types";

const tabs = [
  { key: "keywords", label: "Palavras Chave", icon: TagIcon },
  { key: "sequences", label: "Sequências", icon: ListOrdered },
  { key: "webhooks", label: "Webhooks", icon: WebhookIcon },
] as const;

export default function AutomationPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("keywords");
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [flows, setFlows] = useState<{ id: string; name: string }[]>([]);
  const [openKw, setOpenKw] = useState(false);

  async function load() {
    const [k, s, w, m] = await Promise.all([
      fetch("/api/automation/keywords").then((r) => r.json()),
      fetch("/api/automation/sequences").then((r) => r.json()),
      fetch("/api/automation/webhooks").then((r) => r.json()),
      fetch("/api/meta").then((r) => r.json()),
    ]);
    setKeywords(k);
    setSequences(s);
    setWebhooks(w);
    setFlows(m.flows);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="pb-12">
      <PageHeader
        title="Automação"
        action={tab === "keywords" ? <button className="btn-primary" onClick={() => setOpenKw(true)}><Plus className="h-4 w-4" /> Criar</button> : undefined}
      />
      <div className="px-4 sm:px-8">
        <div className="mb-5 flex gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${tab === t.key ? "bg-gray-900 text-white" : "text-ink-soft hover:bg-gray-100"}`}>
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "keywords" && (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-ink-faint">
                  <th className="px-6 py-3 font-medium">Palavra-chave</th>
                  <th className="px-6 py-3 font-medium">Correspondência</th>
                  <th className="px-6 py-3 font-medium">Fluxo iniciado</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((k) => (
                  <tr key={k.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">“{k.word}”</td>
                    <td className="px-6 py-3"><Badge color="blue">{k.matchType}</Badge></td>
                    <td className="px-6 py-3 text-ink-soft">{flows.find((f) => f.id === k.flowId)?.name ?? "—"}</td>
                  </tr>
                ))}
                {keywords.length === 0 && <tr><td colSpan={3} className="px-6 py-10 text-center text-ink-faint">Nenhuma palavra-chave criada.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === "sequences" && (
          <div className="space-y-4">
            {sequences.map((s) => (
              <div key={s.id} className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold">{s.name}</p>
                  <Badge color={s.active ? "green" : "gray"}>{s.active ? "Ativa" : "Pausada"}</Badge>
                </div>
                <div className="space-y-2">
                  {s.steps.map((st, i) => (
                    <div key={st.id} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">{i + 1}</span>
                      <div>
                        <p className="flex items-center gap-1 text-xs text-ink-faint"><Clock className="h-3 w-3" /> {st.delayMinutes === 0 ? "Imediato" : `Após ${st.delayMinutes} min`}</p>
                        <p className="text-sm">{st.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "webhooks" && (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-ink-faint">
                  <th className="px-6 py-3 font-medium">Nome</th>
                  <th className="px-6 py-3 font-medium">URL</th>
                  <th className="px-6 py-3 font-medium">Evento</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((w) => (
                  <tr key={w.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{w.name}</td>
                    <td className="px-6 py-3 font-mono text-xs text-ink-soft">{w.url}</td>
                    <td className="px-6 py-3"><Badge color="purple">{w.event}</Badge></td>
                    <td className="px-6 py-3"><Badge color={w.active ? "green" : "gray"}>{w.active ? "Ativo" : "Inativo"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openKw && <CreateKeywordModal flows={flows} onClose={() => setOpenKw(false)} onCreated={() => { setOpenKw(false); load(); }} />}
    </div>
  );
}

function CreateKeywordModal({ flows, onClose, onCreated }: { flows: { id: string; name: string }[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ word: "", matchType: "contains", flowId: "" });
  async function submit() {
    await fetch("/api/automation/keywords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    onCreated();
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Nova Palavra-chave</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-ink-faint" /></button>
        </div>
        <div className="space-y-3">
          <input className="input" placeholder='Palavra (ex: quero, pix, depositar)' value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} />
          <select className="input" value={form.matchType} onChange={(e) => setForm({ ...form, matchType: e.target.value })}>
            <option value="contains">Contém</option>
            <option value="exact">Exata</option>
            <option value="starts">Começa com</option>
          </select>
          <select className="input" value={form.flowId} onChange={(e) => setForm({ ...form, flowId: e.target.value })}>
            <option value="">Fluxo a iniciar...</option>
            {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!form.word} onClick={submit}>Criar</button>
        </div>
      </div>
    </div>
  );
}
