"use client";

// Prévia visual do fluxo — simula a conversa no estilo WhatsApp, mostrando
// as mensagens/mídias do bot aparecendo "em ação". Ao chegar numa Pergunta ou
// Botões, espera o teste responder (digitar/clicar) para avançar — igual ao motor real.

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Minimize2, Send, Plus, Mic, Play } from "lucide-react";

type Dir = "in" | "out" | "sys";
type Bubble = { id: string; dir: Dir; type: "text" | "image" | "video" | "audio" | "file"; content?: string; url?: string };
type Waiting = { kind: "question" | "buttons"; nodeId: string; buttons?: any[] } | null;

let seq = 0;
const uid = () => `pb_${++seq}`;

const startNodeOf = (nodes: any[], edges: any[]) => {
  const targets = new Set(edges.map((e) => e.target));
  return nodes.find((n) => !targets.has(n.id)) ?? nodes[0];
};
const nextId = (edges: any[], nodeId: string, handle?: string) => {
  const out = edges.filter((e) => e.source === nodeId);
  if (handle) return out.find((e) => e.sourceHandle === handle)?.target;
  return (out.find((e) => !e.sourceHandle) || out.find((e) => e.sourceHandle === "next") || out[0])?.target;
};

export default function FlowPreview({ nodes, edges, contactName = "Contato de teste", onClose }: { nodes: any[]; edges: any[]; contactName?: string; onClose: () => void }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [waiting, setWaiting] = useState<Waiting>(null);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<any[]>([]);
  const token = useRef(0);

  const wait = (ms: number, t: number) =>
    new Promise<boolean>((res) => {
      const id = setTimeout(() => res(token.current === t), ms);
      timers.current.push(id);
    });

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  // executa o fluxo a partir de um node, empilhando as bolhas com pequeno atraso (efeito "digitando")
  const run = useCallback(async (fromId: string | undefined, t: number) => {
    let cur = fromId;
    const guard = new Set<string>();
    while (cur && !guard.has(cur)) {
      if (token.current !== t) return;
      guard.add(cur);
      const node = nodes.find((n) => n.id === cur);
      if (!node) break;
      const d = node.data || {};

      const emitIn = async (b: Omit<Bubble, "id" | "dir">) => {
        setTyping(true);
        if (!(await wait(650, t))) return false;
        setTyping(false);
        setBubbles((arr) => [...arr, { id: uid(), dir: "in", ...b }]);
        return await wait(180, t);
      };
      const emitSys = async (content: string) => {
        setBubbles((arr) => [...arr, { id: uid(), dir: "sys", type: "text", content }]);
        return await wait(250, t);
      };

      switch (node.type) {
        case "message":
          if (d.text) if (!(await emitIn({ type: "text", content: d.text }))) return;
          for (const el of d.elements || [])
            if (["image", "video", "audio", "file"].includes(el.type) && el.value)
              if (!(await emitIn({ type: el.type, url: el.value }))) return;
          break;
        case "image":
        case "video":
        case "audio":
          if (!(await emitIn({ type: node.type, url: d.url, content: d.caption }))) return;
          break;
        case "gpt":
          if (d.prompt) if (!(await emitIn({ type: "text", content: `🤖 ${d.prompt}` }))) return;
          break;
        case "question":
          if (d.text) if (!(await emitIn({ type: "text", content: d.text }))) return;
          setWaiting({ kind: "question", nodeId: node.id });
          return;
        case "buttons": {
          const opts = (d.buttons || []).map((b: any, i: number) => `${i + 1}. ${b.label}`).join("\n");
          if (!(await emitIn({ type: "text", content: `${d.text || ""}\n\n${opts}`.trim() }))) return;
          setWaiting({ kind: "buttons", nodeId: node.id, buttons: d.buttons || [] });
          return;
        }
        case "tag":
          if (!(await emitSys(`🏷️ etiqueta: ${d.tag || ""}`))) return;
          break;
        case "transfer":
          await emitSys("— transferido para um atendente —");
          setDone(true);
          return;
        case "delay":
          if (!(await emitSys(`⏳ aguarda ${d.minutes || 0} ${d.unit || "minutos"}`))) return;
          cur = nextId(edges, cur);
          continue;
        case "randomizer": {
          const outs = edges.filter((e) => e.source === cur);
          cur = outs.length ? outs[Math.floor(Math.random() * outs.length)]?.target : undefined;
          continue;
        }
        case "end":
          setDone(true);
          return;
      }
      cur = nextId(edges, cur);
    }
    setDone(true);
  }, [nodes, edges]);

  const restart = useCallback(() => {
    clearTimers();
    token.current += 1;
    const t = token.current;
    setBubbles([]);
    setWaiting(null);
    setTyping(false);
    setDone(false);
    run(startNodeOf(nodes, edges)?.id, t);
  }, [nodes, edges, run]);

  // inicia ao montar / reinicia ao trocar o fluxo
  useEffect(() => { restart(); return () => { clearTimers(); token.current += 1; }; }, [restart]);

  // auto-scroll para a última mensagem
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [bubbles, typing]);

  function reply(text: string) {
    if (!waiting || !text.trim()) return;
    setBubbles((arr) => [...arr, { id: uid(), dir: "out", type: "text", content: text }]);
    let next: string | undefined;
    if (waiting.kind === "buttons") {
      const idx = parseInt(text.trim(), 10) - 1;
      let btn = waiting.buttons?.[idx];
      if (!btn) btn = waiting.buttons?.find((b: any) => text.toLowerCase().includes((b.label || "").toLowerCase()));
      next = nextId(edges, waiting.nodeId, btn?.id);
    } else {
      next = nextId(edges, waiting.nodeId, "answered") ?? nextId(edges, waiting.nodeId);
    }
    const t = token.current;
    setWaiting(null);
    setDraft("");
    run(next, t);
  }

  return (
    <div className="absolute left-1/2 top-6 z-20 flex h-[560px] w-[360px] max-w-[92vw] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
      {/* cabeçalho */}
      <div className="shrink-0 border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-500"><Play className="h-4 w-4" /></span>
            Visualização
          </div>
          <div className="flex items-center gap-1 text-ink-faint">
            <button onClick={restart} title="Reiniciar" className="grid h-8 w-8 place-items-center rounded-full hover:bg-gray-100"><RefreshCw className="h-4 w-4" /></button>
            <button onClick={onClose} title="Fechar" className="grid h-8 w-8 place-items-center rounded-full hover:bg-gray-100"><Minimize2 className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-gray-200 text-[10px] text-gray-500">👤</span>
            <span className="text-sm font-medium text-ink">{contactName}</span>
          </div>
          <span className="text-xs text-ink-faint">Prévia do fluxo</span>
        </div>
      </div>

      {/* corpo (estilo WhatsApp) */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-4" style={{ backgroundColor: "#efeae2" }}>
        {bubbles.map((b) =>
          b.dir === "sys" ? (
            <div key={b.id} className="flex justify-center">
              <span className="rounded-md bg-white/70 px-2 py-1 text-[11px] text-gray-500 shadow-sm">{b.content}</span>
            </div>
          ) : (
            <div key={b.id} className={`flex ${b.dir === "out" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-lg px-1.5 py-1.5 text-sm shadow-sm ${b.dir === "out" ? "bg-[#d9fdd3]" : "bg-white"}`}>
                {b.type === "text" && <p className="whitespace-pre-line px-1.5 py-0.5 text-gray-800">{b.content}</p>}
                {b.type === "image" && b.url && <img src={b.url} alt="" className="max-h-52 rounded-md" />}
                {b.type === "video" && b.url && <video src={b.url} controls className="max-h-52 rounded-md" />}
                {b.type === "audio" && b.url && <audio src={b.url} controls className="w-56" />}
                {b.type === "file" && <p className="px-1.5 py-0.5 text-gray-700">📎 arquivo</p>}
                {b.content && (b.type === "image" || b.type === "video") && <p className="px-1.5 pb-0.5 pt-1 text-gray-800">{b.content}</p>}
              </div>
            </div>
          ),
        )}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
              </span>
            </div>
          </div>
        )}
        {done && !waiting && (
          <div className="flex justify-center pt-1">
            <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] text-gray-500">— fim do fluxo —</span>
          </div>
        )}
      </div>

      {/* botões rápidos quando o fluxo espera uma escolha */}
      {waiting?.kind === "buttons" && (
        <div className="flex flex-wrap gap-1.5 border-t border-gray-100 bg-white px-3 py-2">
          {waiting.buttons?.map((b: any, i: number) => (
            <button key={b.id || i} onClick={() => reply(b.label)} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100">
              {b.label}
            </button>
          ))}
        </div>
      )}

      {/* barra de digitação */}
      <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 bg-white px-3 py-2">
        <Plus className="h-5 w-5 text-brand-400" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") reply(draft); }}
          placeholder={waiting ? "Responda para avançar…" : "O fluxo não espera resposta agora"}
          disabled={!waiting}
          className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none disabled:opacity-60"
        />
        {draft.trim() && waiting ? (
          <button onClick={() => reply(draft)} className="grid h-9 w-9 place-items-center rounded-full bg-brand-400 text-white"><Send className="h-4 w-4" /></button>
        ) : (
          <Mic className="h-5 w-5 text-brand-400" />
        )}
      </div>
    </div>
  );
}
