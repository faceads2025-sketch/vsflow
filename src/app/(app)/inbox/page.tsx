"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, Image as ImageIcon, Mic, Bot, BotOff, Search, RefreshCw, Trash2, ArrowLeft, ChevronDown, Check, Info, X, Workflow } from "lucide-react";
import { formatTime, formatDateTime } from "@/lib/utils";
import type { Conversation, PipelineColumn } from "@/lib/types";

type Conv = Conversation & {
  phone?: string;
  email?: string;
  campaignId?: string;
  tagIds?: string[];
  subscribedAt?: string;
  pipelineColumnId?: string;
  connectionId?: string;
  connectionLabel?: string | null;
};

export default function InboxPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [flows, setFlows] = useState<{ id: string; name: string; status: string }[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 6000);
  }

  // gravação de áudio
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recTimerRef = useRef<any>(null);
  const cancelRef = useRef(false);

  async function startRecording() {
    if (recording) return;
    // microfone exige contexto seguro: localhost ou HTTPS
    if (typeof window !== "undefined" && !window.isSecureContext && !["localhost", "127.0.0.1"].includes(location.hostname)) {
      alert(
        `O microfone só funciona em localhost ou HTTPS.\n\n` +
          `Você está acessando por: ${location.origin}\n\n` +
          `Soluções:\n• Abra em http://localhost:3000\n• Ou rode com HTTPS: npm run dev -- --experimental-https\n• Ou exponha via ngrok (https)`,
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Seu navegador não suporta gravação de áudio aqui (contexto não seguro ou navegador embutido). Abra no Chrome em http://localhost:3000.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = (window as any).MediaRecorder?.isTypeSupported?.("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      cancelRef.current = false;
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (cancelRef.current) return;
        const type = rec.mimeType || "audio/webm";
        const ext = type.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunksRef.current, { type });
        const file = new File([blob], `audio-${Date.now()}.${ext}`, { type });
        await sendMedia(file, "audio");
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      alert("Não foi possível acessar o microfone. Permita o acesso ao microfone no navegador.");
    }
  }

  function stopRecording(send: boolean) {
    if (!recording) return;
    cancelRef.current = !send;
    clearInterval(recTimerRef.current);
    setRecording(false);
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  const recMMSS = `${String(Math.floor(recSeconds / 60)).padStart(2, "0")}:${String(recSeconds % 60).padStart(2, "0")}`;

  async function resync() {
    setSyncing(true);
    await fetch("/api/whatsapp/resync", { method: "POST" });
    await load();
    setSyncing(false);
  }


  async function load() {
    const [data, cols, fl] = await Promise.all([
      fetch("/api/inbox").then((r) => r.json()),
      fetch("/api/pipeline/columns").then((r) => r.json()).catch(() => []),
      fetch("/api/flows").then((r) => r.json()).catch(() => []),
    ]);
    setConvs(data);
    setColumns(cols);
    setFlows(fl);
    // abre uma conversa específica via ?open=<contactId> (clique no card do Pipeline)
    const openContact = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("open") : null;
    if (openContact) {
      const c = data.find((x: Conv) => x.contactId === openContact);
      if (c) {
        setActiveId(c.id);
        return;
      }
    }
    // auto-seleciona só no desktop (no mobile mostra a lista primeiro)
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
    setActiveId((cur) => cur ?? (isDesktop ? data[0]?.id ?? null : null));
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 4000); // puxa novas conversas/mensagens do WhatsApp
    return () => clearInterval(t);
  }, []);

  const active = convs.find((c) => c.id === activeId);

  async function runFlowManual(flowId: string) {
    if (!active) return;
    await fetch(`/api/inbox/${active.id}/run-flow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowId }),
    });
    setShowInfo(false);
    setTimeout(load, 800);
  }

  // dispara a "segunda parte" do fluxo (avança como se o lead tivesse respondido)
  async function advanceFlowManual() {
    if (!active) return;
    const res = await fetch(`/api/inbox/${active.id}/advance-flow`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((r) => r.json())
      .catch(() => ({ ok: false, reason: "Falha de conexão ao chamar o servidor." }));
    if (!res.ok) {
      showToast(res.reason || "Não foi possível avançar o fluxo.", false);
      return;
    }
    showToast(`Próxima etapa enviada (${res.sent} mensagem(ns)).`, true);
    setTimeout(load, 800);
  }

  async function setStatus(columnId: string) {
    if (!active?.contactId) return;
    setConvs((prev) => prev.map((c) => (c.id === active.id ? { ...c, pipelineColumnId: columnId } : c)));
    await fetch("/api/pipeline/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: active.contactId, columnId }),
    });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, activeId]);

  async function send() {
    if (!text.trim() || !active) return;
    const content = text;
    setText("");
    await fetch(`/api/inbox/${active.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "text", content }),
    });
    await load();
  }

  async function toggleBot() {
    if (!active) return;
    await fetch(`/api/inbox/${active.id}/toggle-bot`, { method: "POST" });
    await load();
  }

  async function sendMedia(file: File, kind: "image" | "video" | "audio" | "file") {
    if (!active) return;
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
    if (!up.url) return;
    await fetch(`/api/inbox/${active.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: kind, content: up.name || file.name, mediaUrl: up.url }),
    });
    await load();
  }

  const filtered = convs.filter((c) => c.contactName.toLowerCase().includes(search.toLowerCase()));

  function Avatar({ name, src }: { name: string; src?: string }) {
    if (src) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={name} className="h-10 w-10 shrink-0 rounded-full object-cover" />;
    }
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* toast de feedback (avançar fluxo etc.) */}
      {toast && (
        <div className={`fixed left-1/2 top-4 z-[60] max-w-md -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-soft ${toast.ok ? "bg-emerald-600" : "bg-amber-600"}`}>
          {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
        </div>
      )}

      {/* Lista */}
      <div className={`${activeId ? "hidden lg:flex" : "flex"} w-full shrink-0 flex-col border-r border-gray-100 bg-white lg:w-80`}>
        <div className="border-b border-gray-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-xl font-bold">Inbox</h1>
            <div className="flex items-center gap-1">
              <button onClick={resync} disabled={syncing} title="Sincronizar conversas do WhatsApp"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-500 transition hover:bg-brand-50 disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "Sincronizando..." : "Sincronizar"}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
            <Search className="h-4 w-4 text-ink-faint" />
            <input className="w-full bg-transparent text-sm outline-none" placeholder="Busca" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left transition hover:bg-gray-50 ${activeId === c.id ? "bg-brand-50" : ""}`}>
              <Avatar name={c.contactName} src={c.avatar} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate font-medium">{c.contactName}</p>
                  <span className="text-xs text-ink-faint">{formatTime(c.lastMessageAt)}</span>
                </div>
                {c.phone?.includes("@") && (
                  <p className="truncate text-[11px] font-medium text-amber-600">🔒 protegido · {c.phone}</p>
                )}
                <p className="truncate text-sm text-ink-faint">{c.preview}</p>
              </div>
              {c.unread > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-400 text-xs font-bold text-white">{c.unread}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      {active ? (
        <div className="flex flex-1 flex-col bg-[#f7f9fb]">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setActiveId(null)} className="text-ink-soft lg:hidden" aria-label="Voltar">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button onClick={() => setShowInfo(true)} className="flex min-w-0 items-center gap-3 text-left">
                <Avatar name={active.contactName} src={active.avatar} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{active.contactName}</p>
                  {active.phone?.includes("@") ? (
                    <p className="truncate text-xs font-medium text-amber-600">🔒 protegido · {active.phone}</p>
                  ) : (
                    <p className="truncate text-xs text-ink-faint">
                      {active.connectionLabel ? `📱 ${active.connectionLabel}` : active.botPaused ? "Automação pausada" : "Automação ativa"}
                    </p>
                  )}
                </div>
              </button>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={() => setShowInfo(true)} title="Informações do contato" className="grid h-9 w-9 place-items-center rounded-full text-ink-faint transition hover:bg-gray-100">
                <Info className="h-5 w-5" />
              </button>
              {/* status do pipeline (move o card no Kanban) */}
              <StatusSelect columns={columns} value={active.pipelineColumnId} onChange={setStatus} />
              <button onClick={toggleBot}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${active.botPaused ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {active.botPaused ? <Bot className="h-4 w-4" /> : <BotOff className="h-4 w-4" />}
                <span className="hidden lg:inline">{active.botPaused ? "Reativar" : "Assumir"}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-6">
            {active.messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm sm:max-w-[60%] ${m.direction === "outbound" ? "bg-brand-400 text-white" : "bg-white"}`}>
                  {m.fromBot && <p className="mb-0.5 text-[10px] font-semibold uppercase opacity-70">🤖 Bot</p>}
                  {m.mediaUrl && m.type === "image" && <img src={m.mediaUrl} alt="" className="mb-1 max-h-52 rounded-lg" />}
                  {m.mediaUrl && m.type === "video" && <video src={m.mediaUrl} controls className="mb-1 max-h-52 rounded-lg" />}
                  {m.mediaUrl && m.type === "audio" && <audio src={m.mediaUrl} controls className="mb-1 w-56" />}
                  {m.mediaUrl && m.type === "file" && <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="mb-1 block underline">📎 {m.content}</a>}
                  {(m.type === "text" || !m.mediaUrl) && <p>{m.content}</p>}
                  <p className={`mt-1 text-right text-[10px] ${m.direction === "outbound" ? "text-white/70" : "text-ink-faint"}`}>{formatTime(m.createdAt)}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-100 bg-white p-4">
            {recording ? (
              <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                <span className="text-sm font-medium text-red-600">Gravando... {recMMSS}</span>
                <span className="flex-1" />
                <button onClick={() => stopRecording(false)} className="flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink" title="Cancelar">
                  <Trash2 className="h-4 w-4" /> Cancelar
                </button>
                <button onClick={() => stopRecording(true)} className="btn-primary !px-4 !py-2" title="Enviar áudio">
                  <Send className="h-4 w-4" /> Enviar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2">
                <label className="cursor-pointer text-ink-faint hover:text-ink" title="Enviar arquivo">
                  <Paperclip className="h-5 w-5" />
                  <input type="file" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const t = f.type.startsWith("image") ? "image" : f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "audio" : "file";
                    sendMedia(f, t);
                  }} />
                </label>
                <label className="cursor-pointer text-ink-faint hover:text-ink" title="Enviar imagem/vídeo">
                  <ImageIcon className="h-5 w-5" />
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) sendMedia(f, f.type.startsWith("video") ? "video" : "image"); }} />
                </label>
                <input className="flex-1 bg-transparent text-sm outline-none" placeholder="Escreva uma mensagem..." value={text}
                  onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
                {text.trim() ? (
                  <button className="btn-primary !px-3 !py-2" onClick={send} title="Enviar"><Send className="h-4 w-4" /></button>
                ) : (
                  <button className="grid h-9 w-9 place-items-center rounded-full bg-brand-400 text-white transition hover:bg-brand-500" onClick={startRecording} title="Gravar áudio">
                    <Mic className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden flex-1 place-items-center px-6 text-center text-ink-faint lg:grid">Nenhum chat selecionado, por favor selecione um dos chats</div>
      )}

      {/* Modal de informações do contato + enviar fluxo manual */}
      {showInfo && active && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setShowInfo(false)}>
          <div className="flex h-full w-full max-w-sm flex-col bg-white shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="font-semibold">Informações do contato</h3>
              <button onClick={() => setShowInfo(false)}><X className="h-5 w-5 text-ink-faint" /></button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="flex flex-col items-center gap-2 text-center">
                {active.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={active.avatar} alt="" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-gray-200 text-2xl font-semibold text-gray-600">{active.contactName.charAt(0).toUpperCase()}</div>
                )}
                <p className="text-lg font-semibold">{active.contactName}</p>
                {active.phone?.includes("@") ? (
                  <span className="text-sm font-medium text-amber-600">🔒 protegido · {active.phone}</span>
                ) : active.phone ? (
                  <a href={`https://wa.me/${active.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-sm text-brand-500 hover:underline">
                    {active.phone}
                  </a>
                ) : null}
              </div>

              <div className="space-y-2 text-sm">
                <InfoRow label="Número (caixa)" value={active.connectionLabel || "—"} />
                <InfoRow label="Status no pipeline" value={columns.find((c) => c.id === active.pipelineColumnId)?.name || "—"} />
                <InfoRow label="Atendente" value={active.assignedTo || "Sem atendente"} />
                <InfoRow label="Entrou em" value={active.subscribedAt ? formatDateTime(active.subscribedAt) : "—"} />
                <InfoRow label="Automação" value={active.botPaused ? "Pausada" : "Ativa"} />
              </div>

              {active.tagIds && active.tagIds.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-soft">Etiquetas</p>
                  <div className="flex flex-wrap gap-1">
                    {active.tagIds.map((t) => <span key={t} className="pill bg-gray-100 text-gray-600">{t}</span>)}
                  </div>
                </div>
              )}

              {/* Avançar fluxo (2ª parte / resposta do lead) */}
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Workflow className="h-4 w-4 text-emerald-500" /> Avançar fluxo (resposta)</p>
                <p className="mb-3 text-xs text-ink-faint">Dispara a próxima etapa do fluxo, como se o lead tivesse respondido. Use quando ele respondeu mas o fluxo não avançou sozinho.</p>
                <button onClick={advanceFlowManual} className="flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-100">
                  Disparar próxima etapa
                  <Send className="h-4 w-4" />
                </button>
              </div>

              {/* Enviar fluxo manualmente */}
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Workflow className="h-4 w-4 text-brand-500" /> Enviar fluxo manualmente</p>
                <p className="mb-3 text-xs text-ink-faint">Dispara um fluxo do começo para este contato (útil quando não disparou sozinho).</p>
                <div className="space-y-2">
                  {flows.filter((f) => f.status === "published").map((f) => (
                    <button key={f.id} onClick={() => runFlowManual(f.id)} className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-left text-sm transition hover:bg-brand-50 hover:border-brand-300">
                      {f.name}
                      <Send className="h-4 w-4 text-brand-500" />
                    </button>
                  ))}
                  {flows.filter((f) => f.status === "published").length === 0 && (
                    <p className="text-xs text-ink-faint">Nenhum fluxo publicado. Publique um fluxo em "Fluxos de conversa".</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-ink-faint">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

// Seletor de status do Pipeline (pílula colorida + dropdown). Ao escolher, move o card no Kanban.
function StatusSelect({
  columns,
  value,
  onChange,
}: {
  columns: PipelineColumn[];
  value?: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = columns.find((c) => c.id === value);
  const color = current?.color || "#9CA3AF";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Status no Pipeline"
        className="flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition"
        style={{ borderColor: color + "55", background: current ? color + "14" : "#fff", color: current ? color : "#6B7280" }}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <span className="max-w-[110px] truncate">{current?.name || "Definir status"}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1 shadow-soft">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Status do lead</p>
            {columns.map((c) => (
              <button
                key={c.id}
                onClick={() => { onChange(c.id); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-gray-50"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="flex-1 truncate">{c.name}</span>
                {value === c.id && <Check className="h-4 w-4 text-brand-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
