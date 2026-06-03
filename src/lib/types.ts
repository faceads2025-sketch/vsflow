// Tipos compartilhados de domínio (espelham o schema Prisma de forma leve)

export type FlowNodeType =
  | "message"
  | "image"
  | "video"
  | "audio"
  | "question"
  | "buttons"
  | "condition"
  | "delay"
  | "transfer"
  | "tag"
  | "goto"
  | "webhook"
  | "randomizer"
  | "gpt"
  | "end";

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  tags: string[];
  campaignId?: string;
  subscribedAt: string;
  // pipeline (Kanban de leads)
  pipelineColumnId?: string;
  pipelineOrder?: number;
  // qual conexão/número do WhatsApp atende esse contato
  connectionId?: string;
  // já recebeu o fluxo padrão de boas-vindas? (evita repetir a cada mensagem)
  welcomeSent?: boolean;
}

export interface PipelineColumn {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
  flowId?: string;
  participants: number;
  executions: number;
  ctr: number;
  createdAt: string;
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  label?: string;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  status: "draft" | "published";
  nodes: FlowNode[];
  edges: FlowEdge[];
  executions: number;
  ctr: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  direction: "inbound" | "outbound";
  type: "text" | "image" | "audio" | "video" | "file" | "template";
  content: string;
  mediaUrl?: string;
  status: "sent" | "delivered" | "read" | "failed";
  fromBot: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  avatar?: string;
  status: "open" | "closed";
  botPaused: boolean;
  assignedTo?: string;
  lastMessageAt: string;
  unread: number;
  preview: string;
  messages: Message[];
  // estado do fluxo em execução para este contato (avança conforme as respostas)
  flowState?: { flowId: string; nodeId: string; vars?: Record<string, string> };
}

export interface Keyword {
  id: string;
  word: string;
  matchType: "exact" | "contains" | "starts";
  flowId?: string;
}

export interface Sequence {
  id: string;
  name: string;
  active: boolean;
  steps: { id: string; delayMinutes: number; content: string }[];
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  event: string;
  active: boolean;
}

export interface Broadcast {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  messageType: "text" | "template";
  content: string;
  scheduledAt?: string;
  sentAt?: string;
  recipients: number;
  delivered: number;
}

export interface Template {
  id: string;
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  body: string;
  header?: string;
  footer?: string;
}

export interface CustomField {
  id: string;
  name: string;
  key: string;
  type: "text" | "number" | "date" | "boolean";
}

export interface QuickReply {
  id: string;
  shortcut: string;
  content: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  status: "active" | "invited" | "disabled";
}

export interface WhatsappAccount {
  phoneNumber: string;
  displayName: string;
  status: "connected" | "disconnected";
  automationEnabled: boolean;
  companyName: string;
  companyId: string;
}
