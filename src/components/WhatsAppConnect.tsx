"use client";

import { useEffect, useRef, useState } from "react";
import { Smartphone, Loader2, CheckCircle2, LogOut, RefreshCw, ShieldAlert } from "lucide-react";

interface Status {
  status: "offline" | "disconnected" | "connecting" | "qr" | "connected";
  qr: string | null;
  phone: string | null;
  queue: { sentThisHour: number; sentToday: number; hourlyLimit: number; dailyLimit: number; pending: number } | null;
}

export default function WhatsAppConnect() {
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<any>(null);

  async function poll() {
    const s = await fetch("/api/whatsapp/status").then((r) => r.json());
    setSt(s);
  }

  useEffect(() => {
    poll();
    timer.current = setInterval(poll, 2500);
    return () => clearInterval(timer.current);
  }, []);

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

  const status = st?.status ?? "offline";

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-brand-500" />
          <h3 className="font-semibold">Conexão via WhatsApp Web</h3>
        </div>

        {status === "offline" && (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
            Gateway WhatsApp Web offline. Em um terminal, rode <code className="rounded bg-amber-100 px-1">npm run wa</code> e recarregue.
          </div>
        )}

        {status === "connected" && (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-500" />
            <div>
              <p className="text-lg font-semibold">Conectado</p>
              <p className="text-sm text-ink-soft">Número <span className="text-brand-500">+{st?.phone}</span> ativo via WhatsApp Web.</p>
            </div>
            <button className="ml-auto flex items-center gap-1 text-sm font-medium text-red-500 hover:underline" onClick={logout} disabled={busy}>
              <LogOut className="h-4 w-4" /> Desconectar
            </button>
          </div>
        )}

        {(status === "qr") && st?.qr && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <p className="text-sm font-medium">Abra o WhatsApp → Aparelhos conectados → Conectar aparelho</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={st.qr} alt="QR Code" className="h-56 w-56 rounded-xl border border-gray-100" />
            <p className="text-xs text-ink-faint">O QR atualiza sozinho. Aguardando leitura...</p>
          </div>
        )}

        {(status === "connecting" || (status === "qr" && !st?.qr)) && (
          <div className="flex items-center gap-2 py-6 text-sm text-ink-soft">
            <Loader2 className="h-5 w-5 animate-spin" /> Conectando...
          </div>
        )}

        {status === "disconnected" && (
          <div className="py-4">
            <p className="mb-3 text-sm text-ink-soft">Nenhuma sessão ativa.</p>
            <button className="btn-primary" onClick={connect} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Conectar WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* Saúde / anti-ban */}
      {st?.queue && (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-semibold">Proteção do número (anti-ban)</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Metric label="Na hora" value={`${st.queue.sentThisHour}/${st.queue.hourlyLimit}`} />
            <Metric label="Hoje" value={`${st.queue.sentToday}/${st.queue.dailyLimit}`} />
            <Metric label="Na fila" value={String(st.queue.pending)} />
            <Metric label="Envio" value="humanizado" />
          </div>
          <ul className="mt-4 space-y-1 text-xs text-ink-faint">
            <li>• Atrasos aleatórios entre mensagens + simulação de “digitando”.</li>
            <li>• Limites por hora e por dia respeitados automaticamente.</li>
            <li>• Sessão salva em disco + reconexão automática (não re-loga à toa).</li>
            <li>• Envie só para quem optou por receber. Conexão não-oficial tem risco; use com responsabilidade.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
