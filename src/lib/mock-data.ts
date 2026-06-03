import fs from "fs";
import path from "path";
import type {
  Broadcast,
  Campaign,
  Contact,
  Conversation,
  CustomField,
  Flow,
  Keyword,
  QuickReply,
  Sequence,
  Tag,
  Template,
  TeamMember,
  Webhook,
  WhatsappAccount,
} from "./types";

// Dados mockados iniciais — simulam um workspace já em uso (estilo BotConversa).
// Persistem em memória durante a execução do servidor (singleton via globalThis).

function seed() {
  const account: WhatsappAccount = {
    phoneNumber: "+55 47 8822-7384",
    displayName: "Companhia 207554",
    status: "connected",
    automationEnabled: true,
    companyName: "Companhia 207554",
    companyId: "207554",
  };

  const tags: Tag[] = [
    { id: "t1", name: "Lead Quente", color: "#7DE3A6" },
    { id: "t2", name: "Cliente", color: "#3FC8E4" },
    { id: "t3", name: "Aguardando Pix", color: "#FBBF77" },
    { id: "t4", name: "Atendimento Humano", color: "#9A7BFF" },
  ];

  const campaigns: Campaign[] = [
    {
      id: "c1",
      name: "BOMBA",
      slug: "funil-bomba-peniana",
      description: "Funil de entrada principal",
      active: true,
      flowId: "f1",
      participants: 1,
      executions: 0,
      ctr: 0,
      createdAt: "2026-05-28T10:00:00Z",
    },
    {
      id: "c2",
      name: "Black Friday",
      slug: "black-friday",
      description: "Promo sazonal",
      active: true,
      flowId: "f2",
      participants: 0,
      executions: 0,
      ctr: 0,
      createdAt: "2026-05-30T10:00:00Z",
    },
  ];

  const contacts: Contact[] = [
    { id: "ct1", name: "Kennedy Lima", phone: "+55 27 99820-5955", tags: ["t2"], campaignId: "c1", subscribedAt: "2026-06-02T11:27:00Z" },
    { id: "ct2", name: "FV", phone: "+55 89 9436-9605", tags: ["t1"], campaignId: "c1", subscribedAt: "2026-06-02T11:14:00Z" },
    { id: "ct3", name: "Regiana", phone: "+55 11 98477-1020", tags: ["t3"], subscribedAt: "2026-06-01T09:00:00Z" },
    { id: "ct4", name: "Joana", phone: "+55 21 99111-2233", tags: ["t1", "t3"], subscribedAt: "2026-05-30T15:30:00Z" },
    { id: "ct5", name: "Luana", phone: "+55 31 98888-7766", tags: ["t2"], subscribedAt: "2026-05-29T18:10:00Z" },
  ];

  const flows: Flow[] = [
    {
      id: "f1",
      name: "FUNIL BOMBA PENIANA",
      description: "Fluxo de boas-vindas + oferta",
      isDefault: true,
      status: "published",
      executions: 0,
      ctr: 0,
      updatedAt: "2026-05-02T10:00:00Z",
      nodes: [
        { id: "n1", type: "message", position: { x: 80, y: 40 }, data: { text: "Olá! 👋 Bem-vindo ao funil. Você está pronto pra mudar de vida?" } },
        { id: "n2", type: "video", position: { x: 80, y: 220 }, data: { url: "https://exemplo.com/video.mp4", caption: "Assista esse vídeo rápido 👇" } },
        { id: "n3", type: "question", position: { x: 80, y: 400 }, data: { text: "Quer continuar e ver a oferta?", saveTo: "quer_continuar" } },
        { id: "n4", type: "buttons", position: { x: 80, y: 580 }, data: { text: "Escolha uma opção:", buttons: [{ id: "b1", label: "Quero!" }, { id: "b2", label: "Agora não" }] } },
        { id: "n5", type: "message", position: { x: 420, y: 580 }, data: { text: "🔥 Oferta especial: 50% OFF só hoje. Clique aqui: https://oferta.com" } },
        { id: "n6", type: "transfer", position: { x: 420, y: 760 }, data: { note: "Lead quente — falar com atendente" } },
        { id: "n7", type: "end", position: { x: 80, y: 760 }, data: {} },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5", sourceHandle: "b1", label: "Quero!" },
        { id: "e5", source: "n4", target: "n7", sourceHandle: "b2", label: "Agora não" },
        { id: "e6", source: "n5", target: "n6" },
      ],
    },
    {
      id: "f2",
      name: "Boas-vindas",
      description: "Fluxo padrão simples",
      isDefault: false,
      status: "draft",
      executions: 0,
      ctr: 0,
      updatedAt: "2026-05-03T10:00:00Z",
      nodes: [
        { id: "m1", type: "message", position: { x: 80, y: 40 }, data: { text: "Oi! Obrigado por entrar em contato 🙌" } },
        { id: "m2", type: "delay", position: { x: 80, y: 220 }, data: { minutes: 5 } },
        { id: "m3", type: "message", position: { x: 80, y: 400 }, data: { text: "Posso te ajudar com algo?" } },
        { id: "m4", type: "end", position: { x: 80, y: 580 }, data: {} },
      ],
      edges: [
        { id: "g1", source: "m1", target: "m2" },
        { id: "g2", source: "m2", target: "m3" },
        { id: "g3", source: "m3", target: "m4" },
      ],
    },
  ];

  const conversations: Conversation[] = [
    {
      id: "cv1",
      contactId: "ct1",
      contactName: "Kennedy Lima",
      status: "open",
      botPaused: false,
      lastMessageAt: "2026-06-02T18:40:00Z",
      unread: 2,
      preview: "Quero saber mais sobre a oferta",
      messages: [
        { id: "msg1", direction: "inbound", type: "text", content: "Oi, vi o anúncio", status: "read", fromBot: false, createdAt: "2026-06-02T18:30:00Z" },
        { id: "msg2", direction: "outbound", type: "text", content: "Olá! 👋 Bem-vindo ao funil. Você está pronto pra mudar de vida?", status: "delivered", fromBot: true, createdAt: "2026-06-02T18:31:00Z" },
        { id: "msg3", direction: "inbound", type: "text", content: "Quero saber mais sobre a oferta", status: "read", fromBot: false, createdAt: "2026-06-02T18:40:00Z" },
      ],
    },
    {
      id: "cv2",
      contactId: "ct3",
      contactName: "Regiana",
      status: "open",
      botPaused: true,
      assignedTo: "Kennedy",
      lastMessageAt: "2026-06-02T17:10:00Z",
      unread: 0,
      preview: "Já fiz o pix, e agora?",
      messages: [
        { id: "msg4", direction: "inbound", type: "text", content: "Já fiz o pix, e agora?", status: "read", fromBot: false, createdAt: "2026-06-02T17:10:00Z" },
        { id: "msg5", direction: "outbound", type: "text", content: "Perfeito! Vou te passar pro atendimento agora 😊", status: "delivered", fromBot: false, createdAt: "2026-06-02T17:12:00Z" },
      ],
    },
    {
      id: "cv3",
      contactId: "ct4",
      contactName: "Joana",
      status: "open",
      botPaused: false,
      lastMessageAt: "2026-06-02T16:00:00Z",
      unread: 0,
      preview: "pix",
      messages: [
        { id: "msg6", direction: "inbound", type: "text", content: "pix", status: "read", fromBot: false, createdAt: "2026-06-02T16:00:00Z" },
      ],
    },
  ];

  const keywords: Keyword[] = [
    { id: "k1", word: "quero", matchType: "contains", flowId: "f1" },
    { id: "k2", word: "pix", matchType: "contains", flowId: "f1" },
    { id: "k3", word: "depositar", matchType: "contains", flowId: "f1" },
  ];

  const sequences: Sequence[] = [
    {
      id: "s1",
      name: "Recuperação de lead",
      active: true,
      steps: [
        { id: "ss1", delayMinutes: 0, content: "Oi! Vi que você não terminou o cadastro 👀" },
        { id: "ss2", delayMinutes: 5, content: "Ainda dá tempo de pegar a promo 🔥" },
        { id: "ss3", delayMinutes: 60, content: "Última chamada! A oferta encerra hoje." },
      ],
    },
  ];

  const webhooks: Webhook[] = [
    { id: "w1", name: "Enviar lead pro CRM", url: "https://meucrm.com/webhook", event: "contact.created", active: true },
  ];

  const broadcasts: Broadcast[] = [
    { id: "b1", name: "Aviso de manutenção", status: "sent", messageType: "text", content: "Estaremos em manutenção das 2h às 4h.", sentAt: "2026-05-25T10:00:00Z", recipients: 320, delivered: 312 },
    { id: "b2", name: "Promo fim de semana", status: "scheduled", messageType: "template", content: "promo_fds", scheduledAt: "2026-06-07T12:00:00Z", recipients: 500, delivered: 0 },
  ];

  const templates: Template[] = [
    { id: "tp1", name: "boas_vindas", category: "MARKETING", language: "pt_BR", status: "APPROVED", body: "Olá {{1}}! Seja bem-vindo. Como posso ajudar?", footer: "ConversaFlow" },
    { id: "tp2", name: "promo_fds", category: "MARKETING", language: "pt_BR", status: "APPROVED", body: "🔥 {{1}}, sua promo de fim de semana chegou! 50% OFF." },
    { id: "tp3", name: "codigo_verificacao", category: "AUTHENTICATION", language: "pt_BR", status: "PENDING", body: "Seu código é {{1}}." },
  ];

  const customFields: CustomField[] = [
    { id: "cf1", name: "CPF", key: "cpf", type: "text" },
    { id: "cf2", name: "Valor do depósito", key: "valor_deposito", type: "number" },
  ];

  const quickReplies: QuickReply[] = [
    { id: "qr1", shortcut: "/ola", content: "Olá! Tudo bem? Como posso te ajudar?" },
    { id: "qr2", shortcut: "/pix", content: "Aqui está a chave pix: 000.000.000-00" },
  ];

  const team: TeamMember[] = [
    { id: "tm1", name: "Kennedy", email: "kennedy@empresa.com", role: "admin", status: "active" },
    { id: "tm2", name: "Maria", email: "maria@empresa.com", role: "agent", status: "active" },
  ];

  return {
    account,
    tags,
    campaigns,
    contacts,
    flows,
    conversations,
    keywords,
    sequences,
    webhooks,
    broadcasts,
    templates,
    customFields,
    quickReplies,
    team,
  };
}

type Store = ReturnType<typeof seed>;

// Persistência em disco (volume /data no Railway) — sobrevive a redeploys.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

function loadOrSeed(): Store {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
      return { ...seed(), ...saved }; // mescla c/ seed (caso surjam campos novos)
    }
  } catch (e) {
    console.error("[store] falha ao carregar:", e);
  }
  return seed();
}

const g = globalThis as unknown as { __conversaflow?: Store; __cfStoreTimer?: any };

export const db: Store = g.__conversaflow ?? (g.__conversaflow = loadOrSeed());

// salva automaticamente quando algo muda (compara serialização p/ não gravar à toa)
if (!g.__cfStoreTimer) {
  let last = "";
  g.__cfStoreTimer = setInterval(() => {
    try {
      const cur = JSON.stringify(db);
      if (cur !== last) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(STORE_FILE, cur);
        last = cur;
      }
    } catch (e) {
      console.error("[store] falha ao salvar:", e);
    }
  }, 5000);
}

export function uid(prefix = "id") {
  // determinístico o suficiente para mock; sem Date.now em runtime do servidor é ok aqui
  return `${prefix}_${Math.floor(performance.now() * 1000).toString(36)}${Math.floor(performance.timeOrigin).toString(36)}`;
}

const digits = (s: string) => (s || "").replace(/\D/g, "");

export function findContactByPhone(phone: string) {
  const d = digits(phone);
  return db.contacts.find((c) => digits(c.phone) === d || (d.length >= 8 && digits(c.phone).endsWith(d.slice(-8))));
}

// Cria/atualiza contato + conversa a partir de um número do WhatsApp.
export function upsertConversation(opts: {
  phone: string;
  name?: string;
  avatar?: string;
  preview?: string;
  timestamp?: string;
  unreadInc?: number;
}) {
  let contact = findContactByPhone(opts.phone);
  if (!contact) {
    contact = {
      id: uid("ct"),
      name: opts.name || opts.phone,
      phone: opts.phone,
      avatar: opts.avatar,
      tags: [],
      subscribedAt: opts.timestamp || new Date().toISOString(),
    };
    db.contacts.unshift(contact);
  } else {
    if (opts.name && (contact.name === contact.phone || !contact.name)) contact.name = opts.name;
    if (opts.avatar) contact.avatar = opts.avatar;
  }

  let conv = db.conversations.find((c) => c.contactId === contact!.id);
  if (!conv) {
    conv = {
      id: uid("cv"),
      contactId: contact.id,
      contactName: contact.name,
      avatar: contact.avatar,
      status: "open",
      botPaused: false,
      lastMessageAt: opts.timestamp || new Date().toISOString(),
      unread: opts.unreadInc || 0,
      preview: opts.preview || "",
      messages: [],
    };
    db.conversations.unshift(conv);
  } else {
    conv.contactName = contact.name;
    if (contact.avatar) conv.avatar = contact.avatar;
    if (opts.preview) conv.preview = opts.preview;
    if (opts.timestamp) conv.lastMessageAt = opts.timestamp;
    if (opts.unreadInc) conv.unread += opts.unreadInc;
  }

  return { contact, conv };
}
