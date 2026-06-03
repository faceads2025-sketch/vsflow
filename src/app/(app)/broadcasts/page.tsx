"use client";

import { useEffect, useState } from "react";
import { Plus, Calendar, FileEdit, History, X } from "lucide-react";
import { PageHeader, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { Broadcast, Template } from "@/lib/types";

const tabs = [
  { key: "active", label: "Ativas e Agendadas", icon: Calendar },
  { key: "draft", label: "Rascunhos", icon: FileEdit },
  { key: "history", label: "Histórico", icon: History },
] as const;

export default function BroadcastsPage() {
  const [items, setItems] = useState<Broadcast[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("active");
  const [open, setOpen] = useState(false);

  async function load() {
    const [b, t] = await Promise.all([
      fetch("/api/broadcasts").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ]);
    setItems(b);
    setTemplates(t);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((b) => {
    if (tab === "active") return b.status === "scheduled" || b.status === "sending";
    if (tab === "draft") return b.status === "draft";
    return b.status === "sent" || b.status === "failed";
  });

  const statusColor: Record<string, any> = { sent: "green", scheduled: "blue", sending: "yellow", draft: "gray", failed: "red" };

  return (
    <div className="pb-12">
      <PageHeader
        title="Transmissão"
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Criar Nova Transmissão</button>}
      />
      <div className="px-8">
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

        {filtered.length === 0 ? (
          <p className="py-20 text-center text-ink-faint">Não há transmissões aqui.</p>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-ink-faint">
                  <th className="px-6 py-3 font-medium">Nome</th>
                  <th className="px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Destinatários</th>
                  <th className="px-6 py-3 font-medium">Entregues</th>
                  <th className="px-6 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{b.name}</td>
                    <td className="px-6 py-3 text-ink-soft">{b.messageType === "template" ? "Template" : "Texto"}</td>
                    <td className="px-6 py-3"><Badge color={statusColor[b.status]}>{b.status}</Badge></td>
                    <td className="px-6 py-3">{b.recipients}</td>
                    <td className="px-6 py-3">{b.delivered}</td>
                    <td className="px-6 py-3 text-ink-soft">{formatDateTime(b.scheduledAt || b.sentAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <CreateBroadcastModal templates={templates} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function CreateBroadcastModal({ templates, onClose, onCreated }: { templates: Template[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", messageType: "text", content: "", templateId: "", scheduledAt: "" });
  const [saving, setSaving] = useState(false);

  async function submit(mode: "send" | "schedule" | "draft") {
    setSaving(true);
    await fetch("/api/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        draft: mode === "draft",
        scheduledAt: mode === "schedule" ? form.scheduledAt : undefined,
      }),
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Nova Transmissão</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-ink-faint" /></button>
        </div>
        <div className="space-y-3">
          <input className="input" placeholder="Nome da transmissão" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="flex gap-2">
            <select className="input" value={form.messageType} onChange={(e) => setForm({ ...form, messageType: e.target.value })}>
              <option value="text">Mensagem de texto</option>
              <option value="template">Template aprovado</option>
            </select>
          </div>
          {form.messageType === "template" ? (
            <select className="input" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value, content: templates.find(t=>t.id===e.target.value)?.name || "" })}>
              <option value="">Selecione um template aprovado</option>
              {templates.filter((t) => t.status === "APPROVED").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          ) : (
            <textarea className="input min-h-[100px]" placeholder="Conteúdo da mensagem" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Agendar (opcional)</label>
            <input type="datetime-local" className="input" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          </div>
          <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">Fora da janela de 24h, a API oficial do WhatsApp exige template aprovado.</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" disabled={saving} onClick={() => submit("draft")}>Salvar rascunho</button>
          {form.scheduledAt && <button className="btn-ghost" disabled={saving} onClick={() => submit("schedule")}>Agendar</button>}
          <button className="btn-primary" disabled={saving || !form.name} onClick={() => submit("send")}>Enviar agora</button>
        </div>
      </div>
    </div>
  );
}
