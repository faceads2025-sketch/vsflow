import type { FlowNodeType } from "@/lib/types";

export interface BlockMeta {
  type: FlowNodeType;
  label: string;
  icon: string; // lucide icon name resolved no componente
  color: string;
  defaultData: Record<string, any>;
}

// Metadados de renderização de cada tipo de bloco no canvas.
export const BLOCKS: BlockMeta[] = [
  { type: "message", label: "Conteúdo", icon: "Star", color: "#EF4444", defaultData: { text: "Digite a mensagem..." } },
  { type: "image", label: "Imagem", icon: "Image", color: "#EF4444", defaultData: { url: "", caption: "" } },
  { type: "video", label: "Vídeo", icon: "Video", color: "#EF4444", defaultData: { url: "", caption: "" } },
  { type: "audio", label: "Áudio", icon: "Mic", color: "#EF4444", defaultData: { url: "" } },
  { type: "question", label: "Pergunta", icon: "HelpCircle", color: "#F59E0B", defaultData: { text: "Qual sua pergunta?", saveTo: "resposta" } },
  { type: "buttons", label: "Menu", icon: "LayoutGrid", color: "#9A7BFF", defaultData: { text: "Escolha uma opção:", buttons: [{ id: "b1", label: "Opção 1" }] } },
  { type: "tag", label: "Ação", icon: "Zap", color: "#F59E0B", defaultData: { tag: "" } },
  { type: "condition", label: "Condição", icon: "Filter", color: "#3FC8E4", defaultData: { field: "", operator: "equals", value: "" } },
  { type: "goto", label: "Conexão de fluxo", icon: "Rocket", color: "#10B981", defaultData: { targetNodeId: "" } },
  { type: "randomizer", label: "Randomizador", icon: "Shuffle", color: "#14B8A6", defaultData: { branches: 2 } },
  { type: "delay", label: "Atraso inteligente", icon: "Clock", color: "#F97316", defaultData: { minutes: 5 } },
  { type: "webhook", label: "Integração", icon: "Puzzle", color: "#EC4899", defaultData: { url: "", method: "POST" } },
  { type: "gpt", label: "Assistente GPT", icon: "Sparkles", color: "#6366F1", defaultData: { prompt: "Você é um atendente..." } },
  { type: "transfer", label: "Transferir p/ atendente", icon: "UserCheck", color: "#EF4444", defaultData: { note: "" } },
  { type: "end", label: "Finalizar conversa", icon: "Square", color: "#6B7280", defaultData: {} },
];

export const blockByType = (t: FlowNodeType) => BLOCKS.find((b) => b.type === t)!;

// Itens do menu flutuante "+" (estilo BotConversa).
export interface MenuItem {
  type: FlowNodeType;
  label: string;
  icon: string;
  color: string;
  pro?: boolean;
}

export const MENU_ITEMS: MenuItem[] = [
  { type: "message", label: "Conteúdo", icon: "Star", color: "#EF4444" },
  { type: "question", label: "Pergunta", icon: "HelpCircle", color: "#F59E0B" },
  { type: "buttons", label: "Menu", icon: "LayoutGrid", color: "#9A7BFF" },
  { type: "tag", label: "Ação", icon: "Zap", color: "#F59E0B" },
  { type: "condition", label: "Condição", icon: "Filter", color: "#3FC8E4" },
  { type: "goto", label: "Conexão de fluxo", icon: "Rocket", color: "#10B981" },
  { type: "randomizer", label: "Randomizador", icon: "Shuffle", color: "#14B8A6" },
  { type: "delay", label: "Atraso inteligente", icon: "Clock", color: "#F97316" },
  { type: "webhook", label: "Integração", icon: "Puzzle", color: "#EC4899", pro: true },
  { type: "gpt", label: "Assistente GPT", icon: "Sparkles", color: "#6366F1", pro: true },
];
