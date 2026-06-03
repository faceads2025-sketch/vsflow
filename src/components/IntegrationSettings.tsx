"use client";

import { useEffect, useState } from "react";
import { Save, Check, Copy, Plug, Plus, Trash2 } from "lucide-react";

interface Connection {
  id: string;
  label: string;
  instanceId: string;
  token: string;
}
interface Config {
  mode: "mock" | "zapi" | "web" | "cloud";
  zapiClientToken: string;
  connections: Connection[];
}

const MODES = [
  { value: "zapi", label: "Z-API", desc: "WhatsApp na nuvem (recomendado)" },
  { value: "web", label: "WhatsApp Web", desc: "Baileys (gateway local)" },
  { value: "cloud", label: "Cloud API", desc: "API oficial da Meta" },
  { value: "mock", label: "Mock", desc: "Só testes" },
] as const;

export default function IntegrationSettings() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/integration").then((r) => r.json()).then(setCfg);
  }, []);

  async function save() {
    if (!cfg) return;
    setSaving(true);
    const next = await fetch("/api/integration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    }).then((r) => r.json());
    setCfg(next);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function updateConn(id: string, patch: Partial<Connection>) {
    setCfg((c) => (c ? { ...c, connections: c.connections.map((x) => (x.id === id ? { ...x, ...patch } : x)) } : c));
  }
  function addConn() {
    setCfg((c) =>
      c ? { ...c, connections: [...c.connections, { id: `conn${Date.now()}`, label: `Número ${c.connections.length + 1}`, instanceId: "", token: "" }] } : c,
    );
  }
  function removeConn(id: string) {
    setCfg((c) => (c ? { ...c, connections: c.connections.filter((x) => x.id !== id) } : c));
  }

  if (!cfg) return <p className="text-ink-faint">Carregando...</p>;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Plug className="h-5 w-5 text-brand-500" />
          <h3 className="font-semibold">Provedor de WhatsApp</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setCfg({ ...cfg, mode: m.value })}
              className={`rounded-xl border p-3 text-left transition ${cfg.mode === m.value ? "border-brand-400 bg-brand-50" : "border-gray-200 hover:bg-gray-50"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{m.label}</span>
                {cfg.mode === m.value && <Check className="h-4 w-4 text-brand-500" />}
              </div>
              <p className="text-xs text-ink-faint">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {cfg.mode === "zapi" && (
        <>
          <div className="card p-6">
            <label className="mb-1 block text-xs font-medium text-ink-soft">Client-Token (segurança da conta — compartilhado)</label>
            <input className="input font-mono text-sm" value={cfg.zapiClientToken} placeholder="token de segurança da conta Z-API"
              onChange={(e) => setCfg({ ...cfg, zapiClientToken: e.target.value })} />
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Números conectados</h3>
            <button className="btn-ghost" onClick={addConn}><Plus className="h-4 w-4" /> Adicionar número</button>
          </div>

          {cfg.connections.map((conn) => {
            const webhook = `${origin}/api/zapi/webhook?inst=${conn.id}`;
            return (
              <div key={conn.id} className="card p-6">
                <div className="mb-3 flex items-center gap-2">
                  <input className="input max-w-[220px] font-semibold" value={conn.label} onChange={(e) => updateConn(conn.id, { label: e.target.value })} />
                  <button className="ml-auto text-red-400 hover:text-red-600" onClick={() => removeConn(conn.id)} title="Remover número"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-soft">Instance ID</label>
                    <input className="input font-mono text-sm" value={conn.instanceId} onChange={(e) => updateConn(conn.id, { instanceId: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-soft">Token da instância</label>
                    <input className="input font-mono text-sm" value={conn.token} onChange={(e) => updateConn(conn.id, { token: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-soft">Webhook "Ao receber" deste número (cole no Z-API)</label>
                    <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2 text-xs">
                      <span className="truncate font-mono text-ink-soft">{webhook}</span>
                      <button className="ml-auto text-brand-500" onClick={() => navigator.clipboard.writeText(webhook)}><Copy className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {cfg.connections.length === 0 && <p className="text-sm text-ink-faint">Nenhum número. Clique em "Adicionar número".</p>}
        </>
      )}

      {cfg.mode === "web" && (
        <div className="card p-5 text-sm text-ink-soft">Modo WhatsApp Web (Baileys): rode <code>npm run wa</code> e escaneie o QR na aba <b>Conexão</b>.</div>
      )}
      {cfg.mode === "cloud" && (
        <div className="card p-5 text-sm text-ink-soft">Modo Cloud API: configure <code>WHATSAPP_PHONE_NUMBER_ID</code> e <code>WHATSAPP_ACCESS_TOKEN</code> nas variáveis.</div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar integração"}
        </button>
        <span className="text-xs text-ink-faint">Cada número tem seu próprio webhook (com <code>?inst=</code>).</span>
      </div>
    </div>
  );
}
