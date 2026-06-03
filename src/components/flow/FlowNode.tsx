"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import * as Icons from "lucide-react";
import { blockByType } from "./blocks";
import type { FlowNodeType } from "@/lib/types";

function summary(type: FlowNodeType, data: any): string {
  switch (type) {
    case "message":
    case "question":
      return data.text || "—";
    case "image":
    case "video":
    case "audio":
      return data.url || "Sem mídia";
    case "buttons":
      return (data.buttons || []).map((b: any) => b.label).join(", ") || "—";
    case "delay":
      return `Aguardar ${data.minutes || 0} ${data.unit || "minutos"}`;
    case "condition":
      return `${data.field || "campo"} ${data.operator || "="} ${data.value || ""}`;
    case "tag":
      return data.tag || "—";
    case "webhook":
      return data.url || "—";
    case "transfer":
      return data.note || "Falar com atendente";
    case "randomizer":
      return `Dividir em ${data.branches || 2} caminhos`;
    case "gpt":
      return data.prompt || "Resposta com IA";
    case "end":
      return "Fim do fluxo";
    default:
      return "";
  }
}

function MediaPreview({ kind, url, caption }: { kind: string; url?: string; caption?: string }) {
  if (!url) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-3 text-[11px] text-ink-faint">
        {kind === "image" && <Icons.Image className="h-4 w-4" />}
        {kind === "video" && <Icons.PlaySquare className="h-4 w-4" />}
        {kind === "audio" && <Icons.Volume2 className="h-4 w-4" />}
        {kind === "file" && <Icons.File className="h-4 w-4" />}
        Sem {kind === "image" ? "imagem" : kind === "video" ? "vídeo" : kind === "audio" ? "áudio" : "arquivo"}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      {kind === "image" && <img src={url} alt="" className="h-24 w-full object-cover" />}
      {kind === "video" && <video src={url} className="h-24 w-full object-cover" muted />}
      {kind === "audio" && <audio src={url} controls className="w-full" />}
      {kind === "file" && (
        <p className="flex items-center gap-1.5 px-2 py-2 text-[11px] text-ink-soft">
          <Icons.File className="h-3.5 w-3.5" /> {url.split("/").pop()}
        </p>
      )}
      {caption && <p className="px-2 py-1 text-[11px] text-ink-soft">{caption}</p>}
    </div>
  );
}

function NodeBody({ type, data }: { type: FlowNodeType; data: any }) {
  // Bloco Conteúdo: mostra o texto + cada elemento de mídia adicionado.
  if (type === "message") {
    const elements: any[] = data.elements || [];
    const hasContent = (data.text && data.text.trim()) || elements.length > 0;
    return (
      <div className="space-y-2 px-3 py-2">
        {data.text && data.text.trim() && (
          <p className="whitespace-pre-wrap text-xs text-ink">{data.text}</p>
        )}
        {elements.map((el) => {
          if (["image", "video", "audio", "file"].includes(el.type)) {
            return <MediaPreview key={el.id} kind={el.type} url={el.value} />;
          }
          if (el.type === "delay") {
            return <div key={el.id} className="rounded-lg bg-gray-50 px-2 py-1 text-[11px] text-ink-faint">⏱ Atraso de {el.minutes ?? 0} min</div>;
          }
          if (el.type === "contact") {
            return <div key={el.id} className="rounded-lg bg-gray-50 px-2 py-1 text-[11px] text-ink-faint">👤 {el.value || "Contato"}</div>;
          }
          return <div key={el.id} className="rounded-lg bg-gray-50 px-2 py-1 text-[11px] text-ink-faint">{el.type}</div>;
        })}
        {!hasContent && <p className="text-xs text-ink-faint">Clique para adicionar conteúdo</p>}
      </div>
    );
  }

  // Blocos de mídia avulsos
  if (type === "image" || type === "video" || type === "audio") {
    return (
      <div className="px-3 py-2">
        <MediaPreview kind={type} url={data.url} caption={data.caption} />
      </div>
    );
  }

  // Demais blocos: resumo em texto
  return (
    <div className="px-3 py-2 text-xs text-ink-soft">
      <p className="line-clamp-3">{summary(type, data)}</p>
    </div>
  );
}

function FlowNodeComponent({ data, type, selected }: NodeProps) {
  const meta = blockByType(type as FlowNodeType);
  const Icon = (Icons as any)[meta.icon] ?? Icons.Circle;
  const isButtons = type === "buttons";
  const isQuestion = type === "question";

  // saídas do bloco de Pergunta (cada uma com seu conector)
  const questionOuts = [
    { id: "answered", label: "Respondeu", color: "#10B981" },
    { id: "noreply", label: "Se não responder", color: "#F59E0B" },
    { id: "next", label: "Próximo passo", color: "#3FC8E4" },
  ];

  return (
    <div
      className={`w-60 rounded-2xl border bg-white shadow-card transition ${selected ? "border-brand-400 ring-2 ring-brand-100" : "border-gray-200"}`}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-gray-300" />

      <div className="flex items-center gap-2 rounded-t-2xl px-3 py-2" style={{ background: meta.color + "18" }}>
        <span className="grid h-6 w-6 place-items-center rounded-lg text-white" style={{ background: meta.color }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
      </div>

      <NodeBody type={type as FlowNodeType} data={data} />

      {isButtons ? (
        <div className="space-y-1 border-t border-gray-100 px-3 py-2">
          {(data.buttons || []).map((b: any) => (
            <div key={b.id} className="relative rounded-lg bg-gray-50 px-2 py-1 text-xs">
              {b.label}
              <Handle
                id={b.id}
                type="source"
                position={Position.Right}
                style={{ top: "50%" }}
                className="!h-3 !w-3 !bg-amber-400"
              />
            </div>
          ))}
        </div>
      ) : isQuestion ? (
        <div className="space-y-1 border-t border-gray-100 px-3 py-2">
          {questionOuts.map((o) => (
            <div key={o.id} className="relative rounded-lg bg-gray-50 px-2 py-1 text-[11px]" style={{ color: o.color }}>
              {o.label}
              <Handle id={o.id} type="source" position={Position.Right} style={{ top: "50%", background: o.color }} className="!h-3 !w-3" />
            </div>
          ))}
        </div>
      ) : (
        type !== "end" && <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !bg-brand-400" />
      )}
    </div>
  );
}

export default memo(FlowNodeComponent);
