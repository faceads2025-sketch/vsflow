"use client";

import { useEffect, useRef, useState } from "react";
import { Smartphone, Loader2, CheckCircle2, LogOut, RefreshCw } from "lucide-react";

export default function WhatsAppConnect() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<any>(null);

  async function poll() {
    const s = await fetch("/api/whatsapp/status").then((r) => r.json());
    setData(s);
  }
  useEffect(() => {
    poll();
    timer.current = setInterval(poll, 3000);
    return () => clearInterval(timer.current);
  }, []);

  const provider = data?.provider;

  // -------- Z-API (multi-número) --------
  if (provider === "zapi") {
    const conns = data.connections || [];
    return (
      <div className="space-y-4">
        {conns.length === 0 && (
          <div className="card p-6 text-sm text-ink-soft">
            Nenhum número configurado. Vá em <b>Integração</b> e adicione uma conexão Z-API.
          </div>
        )}
        {conns.map((c: any) => (
          <div key={c.id} className="card p-6">
            <div className="mb-3 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-brand-500" />
              <h3 className="font-semibold">{c.label}</h3>
              <span
                className={`pill ml-auto ${
                  c.status === "connected" ? "bg-emerald-100 text-emerald-700" : c.status === "qr" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {c.status === "connected" ? "Conectado" : c.status === "qr" ? "Aguardando QR" : c.status === "offline" ? "Offline" : "Desconectado"}
              </span>
            </div>

            {c.status === "connected" && (
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Número <span className="text-brand-500">+{c.phone}</span> conectado.
              </p>
            )}
            {c.status === "qr" && c.qr && (
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <p className="text-sm font-medium">WhatsApp → Aparelhos conectados → Conectar aparelho</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.qr} alt="QR" className="h-52 w-52 rounded-xl border border-gray-100" />
              </div>
            )}
            {c.status === "disconnected" && <p className="text-sm text-ink-soft">Desconectado — gere/escaneie o QR.</p>}
            {c.status === "offline" && <p className="text-sm text-ink-soft">Credenciais incompletas para este número.</p>}
          </div>
        ))}
      </div>
    );
  }

  // -------- WhatsApp Web (Baileys) --------
  const status = data?.status ?? "offline";
  async function connect() {
    setBusy(true);
    await fetch("/api/whatsapp/connect", { method: "POST" });
    setTimeout(poll, 800);
    setBusy(false);
  }
  async function logout() {
    setBusy(true);
    await fetch("/api/whatsapp/logout", { method: "POST" });
    setTimeout(poll, 800);
    setBusy(false);
  }

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-brand-500" />
        <h3 className="font-semibold">Conexão {provider === "web" ? "via WhatsApp Web" : ""}</h3>
      </div>
      {status === "connected" && (
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-500" />
          <div>
            <p className="text-lg font-semibold">Conectado</p>
            <p className="text-sm text-ink-soft">Número <span className="text-brand-500">+{data?.phone}</span> ativo.</p>
          </div>
          <button className="ml-auto flex items-center gap-1 text-sm font-medium text-red-500 hover:underline" onClick={logout} disabled={busy}>
            <LogOut className="h-4 w-4" /> Desconectar
          </button>
        </div>
      )}
      {status === "qr" && data?.qr && (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="text-sm font-medium">WhatsApp → Aparelhos conectados → Conectar aparelho</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.qr} alt="QR Code" className="h-56 w-56 rounded-xl border border-gray-100" />
        </div>
      )}
      {(status === "disconnected" || status === "offline") && (
        <div className="py-2">
          <p className="mb-3 text-sm text-ink-soft">
            {status === "offline" ? "Gateway offline. Rode `npm run wa`." : "Nenhuma sessão ativa."}
          </p>
          <button className="btn-primary" onClick={connect} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Conectar WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
