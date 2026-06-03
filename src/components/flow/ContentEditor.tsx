"use client";

import { useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Bold, Italic, Strikethrough, Braces, Trash2 } from "lucide-react";
import MediaUpload from "./MediaUpload";

const RED = "#EF4444";

// Tipos de conteúdo da grade (estilo BotConversa).
const ELEMENTS = [
  { type: "text", label: "Texto", icon: "ScanText" },
  { type: "image", label: "Imagem", icon: "Image" },
  { type: "video", label: "Video", icon: "PlaySquare" },
  { type: "file", label: "Arquivo", icon: "File" },
  { type: "audio", label: "Áudio", icon: "Volume2" },
  { type: "save", label: "Salvar", icon: "Download" },
  { type: "delay", label: "Atraso", icon: "Clock" },
  { type: "autooff", label: "AutoOff", icon: "Power" },
  { type: "contact", label: "Contato", icon: "Contact" },
] as const;

interface Element {
  id: string;
  type: string;
  value?: string;
  minutes?: number;
}

export default function ContentEditor({
  data,
  onChange,
}: {
  data: any;
  onChange: (data: any) => void;
}) {
  const [draft, setDraft] = useState<string>(data.text || "");
  const ref = useRef<HTMLTextAreaElement>(null);
  const elements: Element[] = data.elements || [];

  function wrap(marker: string, placeholder = "texto") {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const sel = draft.slice(start, end) || placeholder;
    const next = draft.slice(0, start) + marker + sel + marker + draft.slice(end);
    setDraft(next);
    setTimeout(() => {
      el.focus();
      el.selectionStart = start + marker.length;
      el.selectionEnd = start + marker.length + sel.length;
    }, 0);
  }

  function insertVar() {
    const el = ref.current;
    const pos = el?.selectionStart ?? draft.length;
    setDraft(draft.slice(0, pos) + "{{nome}}" + draft.slice(pos));
  }

  function addElement(type: string) {
    if (type === "text") {
      ref.current?.focus();
      return;
    }
    const next: Element = { id: "el_" + Math.floor(performance.now()), type };
    if (type === "delay") next.minutes = 5;
    onChange({ ...data, elements: [...elements, next] });
  }

  function updateElement(id: string, patch: Partial<Element>) {
    onChange({ ...data, elements: elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  }

  function removeElement(id: string) {
    onChange({ ...data, elements: elements.filter((e) => e.id !== id) });
  }

  const dirty = draft !== (data.text || "");

  return (
    <div className="space-y-4">
      {/* composer de texto */}
      <div className="rounded-2xl border p-3" style={{ borderColor: RED + "55", background: RED + "08" }}>
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Insira texto"
          className="min-h-[70px] w-full resize-none bg-transparent text-sm outline-none placeholder:text-ink-faint"
        />
        <div className="mt-2 flex items-center gap-3 text-ink-soft">
          <button onClick={() => wrap("*")} title="Negrito" className="hover:text-ink"><Bold className="h-4 w-4" /></button>
          <button onClick={() => wrap("_")} title="Itálico" className="hover:text-ink"><Italic className="h-4 w-4" /></button>
          <button onClick={() => wrap("~")} title="Tachado" className="hover:text-ink"><Strikethrough className="h-4 w-4" /></button>
          <button onClick={insertVar} title="Inserir variável" className="hover:text-ink"><Braces className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setDraft(data.text || "")}
          disabled={!dirty}
          className="rounded-xl py-2 text-sm font-semibold transition disabled:opacity-50"
          style={{ background: "#DBEAFE", color: "#2563EB" }}
        >
          Cancelar
        </button>
        <button
          onClick={() => onChange({ ...data, text: draft })}
          className="rounded-xl bg-brand-400 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          Salvar
        </button>
      </div>

      {/* elementos adicionados */}
      {elements.length > 0 && (
        <div className="space-y-2">
          {elements.map((el) => {
            const meta = ELEMENTS.find((e) => e.type === el.type);
            return (
              <div key={el.id} className="rounded-xl border border-gray-100 bg-white p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: RED }}>{meta?.label ?? el.type}</span>
                  <button onClick={() => removeElement(el.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                {["image", "video", "audio", "file"].includes(el.type) && (
                  <MediaUpload
                    type={el.type as any}
                    value={el.value}
                    onChange={(url) => updateElement(el.id, { value: url })}
                  />
                )}
                {el.type === "contact" && (
                  <input
                    className="input !py-1.5 text-xs"
                    placeholder="Telefone do contato"
                    value={el.value || ""}
                    onChange={(e) => updateElement(el.id, { value: e.target.value })}
                  />
                )}
                {el.type === "delay" && (
                  <input
                    type="number"
                    className="input !py-1.5 text-xs"
                    placeholder="Minutos"
                    value={el.minutes ?? 5}
                    onChange={(e) => updateElement(el.id, { minutes: Number(e.target.value) })}
                  />
                )}
                {el.type === "save" && <p className="text-xs text-ink-faint">Salva a resposta do contato.</p>}
                {el.type === "autooff" && <p className="text-xs text-ink-faint">Desliga a automação para este contato.</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* grade de tipos de conteúdo */}
      <div className="grid grid-cols-3 gap-2">
        {ELEMENTS.map((e) => {
          const Icon = (Icons as any)[e.icon] ?? Icons.Circle;
          return (
            <button
              key={e.type}
              onClick={() => addElement(e.type)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed py-4 text-xs font-medium transition hover:bg-red-50"
              style={{ borderColor: RED + "66", color: RED, background: RED + "08" }}
            >
              <Icon className="h-5 w-5" />
              {e.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
