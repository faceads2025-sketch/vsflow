"use client";

import { Trash2, X } from "lucide-react";
import type { Node } from "reactflow";
import { blockByType } from "./blocks";
import type { FlowNodeType } from "@/lib/types";
import ContentEditor from "./ContentEditor";
import MediaUpload from "./MediaUpload";

export default function Inspector({
  node,
  onChange,
  onDelete,
  onClose,
}: {
  node: Node | null;
  onChange: (data: any) => void;
  onDelete: () => void;
  onClose?: () => void;
}) {
  if (!node) {
    return (
      <div className="w-72 shrink-0 border-l border-gray-100 bg-white p-5 text-sm text-ink-faint">
        Selecione um bloco para editar suas propriedades.
      </div>
    );
  }

  const meta = blockByType(node.type as FlowNodeType);
  const data = node.data || {};
  const set = (patch: any) => onChange({ ...data, ...patch });

  return (
    <div className="fixed inset-y-0 right-0 z-30 flex w-full max-w-xs flex-col border-l border-gray-100 bg-white shadow-soft lg:static lg:z-auto lg:w-72 lg:shadow-none">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <p className="font-semibold" style={{ color: meta.color }}>{meta.label}</p>
        <div className="flex items-center gap-3">
          <button onClick={onDelete} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          {onClose && <button onClick={onClose} className="text-ink-faint hover:text-ink lg:hidden"><X className="h-5 w-5" /></button>}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
        {node.type === "message" && <ContentEditor data={data} onChange={onChange} />}

        {node.type === "question" && (
          <Field label="Texto">
            <textarea className="input min-h-[100px]" value={data.text || ""} onChange={(e) => set({ text: e.target.value })} />
          </Field>
        )}

        {node.type === "question" && (
          <Field label="Salvar resposta no campo">
            <input className="input" value={data.saveTo || ""} onChange={(e) => set({ saveTo: e.target.value })} />
          </Field>
        )}

        {(node.type === "image" || node.type === "video" || node.type === "audio") && (
          <>
            <Field label="Arquivo">
              <MediaUpload type={node.type} value={data.url} onChange={(url) => set({ url })} />
            </Field>
            {node.type !== "audio" && (
              <Field label="Legenda">
                <input className="input" value={data.caption || ""} onChange={(e) => set({ caption: e.target.value })} />
              </Field>
            )}
          </>
        )}

        {node.type === "buttons" && (
          <>
            <Field label="Texto">
              <textarea className="input" value={data.text || ""} onChange={(e) => set({ text: e.target.value })} />
            </Field>
            <Field label="Botões">
              <div className="space-y-2">
                {(data.buttons || []).map((b: any, i: number) => (
                  <div key={b.id} className="flex gap-1">
                    <input className="input" value={b.label} onChange={(e) => {
                      const buttons = [...data.buttons];
                      buttons[i] = { ...b, label: e.target.value };
                      set({ buttons });
                    }} />
                    <button className="px-2 text-red-400" onClick={() => set({ buttons: data.buttons.filter((x: any) => x.id !== b.id) })}>×</button>
                  </div>
                ))}
                <button className="btn-ghost w-full justify-center !py-1.5 text-xs"
                  onClick={() => set({ buttons: [...(data.buttons || []), { id: "b" + ((data.buttons?.length || 0) + 1) + Math.floor(performance.now() % 1000), label: "Nova opção" }] })}>
                  + Adicionar botão
                </button>
              </div>
            </Field>
          </>
        )}

        {node.type === "delay" && (
          <Field label="Aguardar (minutos)">
            <input type="number" className="input" value={data.minutes || 0} onChange={(e) => set({ minutes: Number(e.target.value) })} />
          </Field>
        )}

        {node.type === "condition" && (
          <>
            <Field label="Campo"><input className="input" value={data.field || ""} onChange={(e) => set({ field: e.target.value })} /></Field>
            <Field label="Operador">
              <select className="input" value={data.operator || "equals"} onChange={(e) => set({ operator: e.target.value })}>
                <option value="equals">igual a</option>
                <option value="contains">contém</option>
                <option value="exists">existe</option>
              </select>
            </Field>
            <Field label="Valor"><input className="input" value={data.value || ""} onChange={(e) => set({ value: e.target.value })} /></Field>
          </>
        )}

        {node.type === "tag" && (
          <Field label="Etiqueta"><input className="input" value={data.tag || ""} onChange={(e) => set({ tag: e.target.value })} /></Field>
        )}

        {node.type === "webhook" && (
          <>
            <Field label="URL"><input className="input" value={data.url || ""} onChange={(e) => set({ url: e.target.value })} /></Field>
            <Field label="Método">
              <select className="input" value={data.method || "POST"} onChange={(e) => set({ method: e.target.value })}>
                <option>POST</option><option>GET</option>
              </select>
            </Field>
          </>
        )}

        {node.type === "transfer" && (
          <Field label="Observação"><textarea className="input" value={data.note || ""} onChange={(e) => set({ note: e.target.value })} /></Field>
        )}

        {node.type === "randomizer" && (
          <Field label="Número de caminhos">
            <input type="number" min={2} max={5} className="input" value={data.branches || 2} onChange={(e) => set({ branches: Number(e.target.value) })} />
          </Field>
        )}

        {node.type === "gpt" && (
          <Field label="Instruções para a IA">
            <textarea className="input min-h-[120px]" value={data.prompt || ""} onChange={(e) => set({ prompt: e.target.value })} />
          </Field>
        )}

        {node.type === "end" && <p className="text-ink-faint">Este bloco encerra a conversa. Sem propriedades.</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-soft">{label}</label>
      {children}
    </div>
  );
}
