"use client";

import { useEffect, useState } from "react";
import { Upload, Download, UserPlus, Filter, X } from "lucide-react";
import { PageHeader, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { Contact, Tag, PipelineColumn } from "@/lib/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [open, setOpen] = useState(false);

  async function load() {
    const [c, m, cols] = await Promise.all([
      fetch("/api/contacts").then((r) => r.json()),
      fetch("/api/meta").then((r) => r.json()),
      fetch("/api/pipeline/columns").then((r) => r.json()).catch(() => []),
    ]);
    setContacts(c);
    setTags(m.tags);
    setCampaigns(m.campaigns);
    setColumns(cols);
  }
  useEffect(() => {
    load();
  }, []);

  const tagName = (id: string) => tags.find((t) => t.id === id);

  const filtered = contacts.filter((c) => {
    const okSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const okTag = !tagFilter || c.tags.includes(tagFilter);
    return okSearch && okTag;
  });

  function exportCsv() {
    const rows = [["Nome", "WhatsApp", "Inscrição"], ...filtered.map((c) => [c.name, c.phone, c.subscribedAt])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "contatos.csv";
    a.click();
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean).slice(1);
    for (const line of lines) {
      const [name, phone] = line.split(",");
      if (name && phone) {
        await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
        });
      }
    }
    load();
  }

  return (
    <div className="pb-12">
      <PageHeader
        title="Contatos"
        action={
          <div className="flex gap-2">
            <label className="btn-ghost cursor-pointer">
              <Upload className="h-4 w-4" /> Importar Contatos
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files && importCsv(e.target.files[0])} />
            </label>
            <button className="btn-ghost" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Baixe Relatório
            </button>
            <button className="btn-green" onClick={() => setOpen(true)}>
              <UserPlus className="h-4 w-4" /> Criar Contato
            </button>
          </div>
        }
      />

      <div className="px-4 sm:px-8">
        <div className="flex items-center gap-3 pb-4">
          <div className="flex items-center gap-2 rounded-full bg-brand-400 px-4 py-2 text-sm font-medium text-white">
            <Filter className="h-4 w-4" /> Filtros
          </div>
          <select className="input max-w-[200px]" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="">Todas as etiquetas</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input className="input max-w-xs" placeholder="Busca" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-ink-faint">
                <th className="px-6 py-3 font-medium">Usuários</th>
                <th className="px-6 py-3 font-medium">WhatsApp</th>
                <th className="px-6 py-3 font-medium">Etiquetas</th>
                <th className="px-6 py-3 font-medium">Data de inscrição</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium">{c.name}</td>
                  <td className="px-6 py-3 text-ink-soft">{c.phone}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const col = columns.find((k) => k.id === c.pipelineColumnId);
                        return col ? (
                          <span className="pill font-semibold" style={{ background: col.color + "22", color: col.color }}>
                            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: col.color }} />
                            {col.name}
                          </span>
                        ) : null;
                      })()}
                      {c.tags.map((id) => {
                        const t = tagName(id);
                        return t ? <span key={id} className="pill" style={{ background: t.color + "22", color: t.color }}>{t.name}</span> : null;
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-ink-soft">{formatDateTime(c.subscribedAt)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-ink-faint">Nenhum contato encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && <CreateContactModal campaigns={campaigns} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function CreateContactModal({ campaigns, onClose, onCreated }: { campaigns: { id: string; name: string }[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", campaignId: "" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Criar Contato</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-ink-faint" /></button>
        </div>
        <div className="space-y-3">
          <input className="input" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="WhatsApp (+55...)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input" placeholder="E-mail (opcional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className="input" value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })}>
            <option value="">Sem campanha de origem</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={saving || !form.name || !form.phone} onClick={submit}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
