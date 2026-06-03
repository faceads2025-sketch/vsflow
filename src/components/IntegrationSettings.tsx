"use client";

import { useEffect, useState } from "react";
import { Save, Check, Copy, Plug } from "lucide-react";

interface Config {
  mode: "mock" | "zapi" | "web" | "cloud";
  zapiInstanceId: string;
  zapiToken: string;
  zapiClientToken: string;
}

const MODES = [
  { value: "zapi", label: "Z-API", desc: "WhatsApp na nuvem (recomendado)" },
  { value: "web", label: "WhatsApp Web", desc: "Baileys (gateway local, não-oficial)" },
  { value: "cloud", label: "Cloud API", desc: "API oficial da Meta" },
  { value: "mock", label: "Mock", desc: "Só testes (não envia de verdade)" },
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

  if (!cfg) return <p className="text-ink-faint">Carregando...</p>;

  const webhookUrl =
    (typeof window !== "undefined" ? window.location.origin : "") + "/api/zapi/webhook";

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
              className={`rounded-xl border p-3 text-left transition ${
                cfg.mode === m.value ? "border-brand-400 bg-brand-50" : "border-gray-200 hover:bg-gray-50"
              }`}
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
        <div className="card p-6">
          <h3 className="mb-4 font-semibold">Credenciais Z-API</h3>
          <div className="space-y-3">
            <Field label="Instance ID" value={cfg.zapiInstanceId} onChange={(v) => setCfg({ ...cfg, zapiInstanceId: v })} placeholder="3F411C52DF58B1F1C3F566DA177DAE5D" />
            <Field label="Token da instância" value={cfg.zapiToken} onChange={(v) => setCfg({ ...cfg, zapiToken: v })} placeholder="D22AACBB1CA3A5CB6386D344" />
            <Field label="Client-Token (segurança da conta — opcional)" value={cfg.zapiClientToken} onChange={(v) => setCfg({ ...cfg, zapiClientToken: v })} placeholder="deixe vazio se não usar" />
          </div>

          <div className="mt-5">
            <label className="mb-1 block text-xs font-medium text-ink-soft">Webhook "Ao receber" (cole no painel do Z-API)</label>
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2 text-xs">
              <span className="truncate font-mono text-ink-soft">{webhookUrl}</span>
              <button className="ml-auto text-brand-500" onClick={() => navigator.clipboard.writeText(webhookUrl)}>
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {cfg.mode === "web" && (
        <div className="card p-5 text-sm text-ink-soft">
          Modo WhatsApp Web (Baileys): rode o gateway (`npm run wa`) e escaneie o QR na aba <b>Conexão</b>.
        </div>
      )}

      {cfg.mode === "cloud" && (
        <div className="card p-5 text-sm text-ink-soft">
          Modo Cloud API oficial: configure <code>WHATSAPP_PHONE_NUMBER_ID</code> e <code>WHATSAPP_ACCESS_TOKEN</code> nas variáveis de ambiente.
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar integração"}
        </button>
        <span className="text-xs text-ink-faint">Depois de salvar, veja o status na aba <b>Conexão</b>.</span>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-soft">{label}</label>
      <input className="input font-mono text-sm" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
