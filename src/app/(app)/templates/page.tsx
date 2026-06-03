"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import type { Template } from "@/lib/types";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    setTemplates(await fetch("/api/templates").then((r) => r.json()));
  }
  useEffect(() => {
    load();
  }, []);

  const statusColor: Record<string, any> = { APPROVED: "green", PENDING: "yellow", REJECTED: "red" };

  return (
    <div className="pb-12">
      <PageHeader title="Modelos" action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Criar modelo</button>} />
      <div className="px-8">
        {templates.length === 0 ? (
          <EmptyState title="Ainda não há modelos" description="Crie o seu primeiro modelo" action={<button className="btn-primary" onClick={() => setOpen(true)}>Criar</button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div key={t.id} className="card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold">{t.name}</p>
                  <Badge color={statusColor[t.status]}>{t.status}</Badge>
                </div>
                <div className="mb-3 flex gap-2 text-xs text-ink-faint">
                  <Badge color="blue">{t.category}</Badge>
                  <span>{t.language}</span>
                </div>
                {t.header && <p className="text-sm font-semibold">{t.header}</p>}
                <p className="rounded-xl bg-gray-50 p-3 text-sm text-ink-soft">{t.body}</p>
                {t.footer && <p className="mt-1 text-xs text-ink-faint">{t.footer}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
      {open && <CreateTemplateModal onClose={() => setOpen(false)} onCreated={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function CreateTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", category: "MARKETING", body: "", header: "", footer: "" });
  async function submit() {
    await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    onCreated();
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Criar modelo</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-ink-faint" /></button>
        </div>
        <div className="space-y-3">
          <input className="input" placeholder="nome_do_modelo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="MARKETING">MARKETING</option>
            <option value="UTILITY">UTILITY</option>
            <option value="AUTHENTICATION">AUTHENTICATION</option>
          </select>
          <input className="input" placeholder="Cabeçalho (opcional)" value={form.header} onChange={(e) => setForm({ ...form, header: e.target.value })} />
          <textarea className="input min-h-[100px]" placeholder="Corpo da mensagem. Use {{1}} para variáveis." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <input className="input" placeholder="Rodapé (opcional)" value={form.footer} onChange={(e) => setForm({ ...form, footer: e.target.value })} />
          <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">O modelo entra como PENDING até aprovação pela Meta.</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!form.name || !form.body} onClick={submit}>Enviar para aprovação</button>
        </div>
      </div>
    </div>
  );
}
