"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, Image as ImageIcon, Mic, Bot, BotOff, Search, RefreshCw, Trash2 } from "lucide-react";
import { formatTime } from "@/lib/utils";
import type { Conversation } from "@/lib/types";

export default function InboxPage() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  async function clearDemo() {
    if (!confirm("Remover as conversas de demonstração? (não afeta o WhatsApp)")) return;
    await fetch("/api/whatsapp/clear-demo", { method: "POST" });
    setActiveId(null);
    await load();
  }

  async function load() {
    const data = await fetch("/api/inbox").then((r) => r.json());
    setConvs(data);
    setActiveId((cur) => cur ?? data[0]?.id ?? null);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 4000); // puxa novas conversas/mensagens do WhatsApp
    return () => clearInterval(t);
  }, []);

  const active = convs.find((c) => c.id === activeId);

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
    <div className="flex h-screen">
      {/* Lista */}
      <div className="flex w-80 shrink-0 flex-col border-r border-gray-100 bg-white">
        <div className="border-b border-gray-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-xl font-bold">Inbox</h1>
            <div className="flex items-center gap-1">
              <button onClick={clearDemo} title="Remover conversas de demonstração"
                className="rounded-lg px-2 py-1 text-xs font-medium text-ink-faint transition hover:bg-gray-100">
                Limpar demo
              </button>
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
          <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <Avatar name={active.contactName} src={active.avatar} />
              <div>
                <p className="font-semibold">{active.contactName}</p>
                <p className="text-xs text-ink-faint">{active.botPaused ? `Automação pausada • ${active.assignedTo ?? "atendente"}` : "Automação ativa"}</p>
              </div>
            </div>
            <button onClick={toggleBot}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${active.botPaused ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {active.botPaused ? <><Bot className="h-4 w-4" /> Reativar automação</> : <><BotOff className="h-4 w-4" /> Assumir conversa</>}
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-6">
            {active.messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[60%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.direction === "outbound" ? "bg-brand-400 text-white" : "bg-white"}`}>
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
                  <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && sendMedia(e.target.files[0], "file")} />
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
        <div className="grid flex-1 place-items-center text-ink-faint">Nenhum chat selecionado, por favor selecione um dos chats</div>
      )}
    </div>
  );
}
