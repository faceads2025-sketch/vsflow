import fs from "fs";
import path from "path";
import type {
  PipelineColumn,
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

  const pipelineColumns: PipelineColumn[] = [
    { id: "col_novo", name: "Novo lead", color: "#3FC8E4", order: 0 },
    { id: "col_andamento", name: "Em andamento", color: "#9A7BFF", order: 1 },
    { id: "col_aguardando", name: "Aguardando resposta", color: "#F59E0B", order: 2 },
    { id: "col_duvida", name: "Em dúvida", color: "#FBBF77", order: 3 },
    { id: "col_naopagou", name: "Não pagou", color: "#EF4444", order: 4 },
    { id: "col_pagou", name: "Pagou", color: "#10B981", order: 5 },
    { id: "col_recuperar", name: "Recuperar depois", color: "#6366F1", order: 6 },
    { id: "col_perdido", name: "Perdido", color: "#6B7280", order: 7 },
  ];

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

  // sem contatos de demonstração — começa limpo (os reais vêm do WhatsApp)
  const contacts: Contact[] = [];

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

  // sem conversas de demonstração — começa limpo
  const conversations: Conversation[] = [];

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
    { id: "tp1", name: "boas_vindas", category: "MARKETING", language: "pt_BR", status: "APPROVED", body: "Olá {{1}}! Seja bem-vindo. Como posso ajudar?", footer: "VS Flow" },
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

  // configuração financeira (gestão de tráfego, produto e frete)
  const finance = {
    trafficSpend: 0, // total gasto com tráfego/anúncios (R$)
    productPrice: 0, // valor de venda do produto (R$)
    productCost: 0, // custo/compra do produto (R$)
    shippingCost: 0, // frete por envio (R$)
    shippedQty: 0, // quantidade de produtos JÁ ENVIADOS (AfterPay/COD; manual)
  };

  return {
    account,
    finance,
    tags,
    pipelineColumns,
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

// remove apenas os dados de demonstração do store carregado
// (NÃO remove mais contatos @lid: leads de anúncio chegam assim e estavam sumindo!)
function cleanStore(store: Store): Store {
  const demoIds = new Set(["ct1", "ct2", "ct3", "ct4", "ct5"]);
  store.contacts = (store.contacts || []).filter((c) => !demoIds.has(c.id));
  const validIds = new Set(store.contacts.map((c) => c.id));
  store.conversations = (store.conversations || []).filter((cv) => validIds.has(cv.contactId));
  return store;
}

function loadOrSeed(): Store {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
      return cleanStore({ ...seed(), ...saved }); // mescla + limpa demo/@lid
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

// casa o contato pelos últimos 8 dígitos (resolve variação de DDI/9º dígito/formato),
// evitando criar conversas duplicadas pra mesma pessoa.
export function findContactByPhone(phone: string) {
  const d = digits(phone);
  if (!d) return undefined;
  const tail = d.slice(-8);
  return db.contacts.find((c) => {
    const cd = digits(c.phone);
    return cd === d || (tail.length === 8 && cd.slice(-8) === tail);
  });
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
