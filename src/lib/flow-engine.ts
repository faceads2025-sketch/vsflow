// Motor de execução de fluxos — STATEFUL.
// Dispara quando o lead manda mensagem, lembra em que bloco parou e avança
// conforme as respostas (texto/botões). Registra as mensagens do bot no Inbox
// e envia de verdade via WhatsApp (Z-API / Baileys / Cloud / mock).

import { db, uid } from "./mock-data";
import { sendText, sendMedia } from "./whatsapp";
import type { Flow, Conversation, Contact, FlowNode } from "./types";

function startNodeOf(flow: Flow): FlowNode | undefined {
  const targets = new Set(flow.edges.map((e) => e.target));
  return flow.nodes.find((n) => !targets.has(n.id)) ?? flow.nodes[0];
}

function nextNodeId(flow: Flow, nodeId: string, handle?: string): string | undefined {
  const edges = flow.edges.filter((e) => e.source === nodeId);
  if (handle) {
    // saída específica: retorna só o que casa (sem fallback p/ não vazar caminho)
    return edges.find((e) => e.sourceHandle === handle)?.target;
  }
  // padrão ("Próximo passo"): edge sem handle, ou marcada "next", senão a primeira
  return (edges.find((e) => !e.sourceHandle) || edges.find((e) => e.sourceHandle === "next") || edges[0])?.target;
}

// registra mensagem do bot na conversa + envia pelo WhatsApp
async function emit(
  conv: Conversation,
  contact: Contact,
  kind: "text" | "image" | "video" | "audio" | "file",
  content: string,
  mediaUrl?: string,
) {
  const now = new Date().toISOString();
  conv.messages.push({
    id: uid("msg"),
    direction: "outbound",
    type: kind,
    content: content || (mediaUrl ? `[${kind}]` : ""),
    mediaUrl,
    status: "sent",
    fromBot: true,
    createdAt: now,
  });
  conv.lastMessageAt = now;
  conv.preview = content || `[${kind}]`;

  try {
    if (kind === "text") {
      if (content) await sendText({ to: contact.phone, body: content, connectionId: contact.connectionId });
    } else if (mediaUrl) {
      await sendMedia({
        to: contact.phone,
        type: kind === "file" ? "document" : (kind as any),
        url: mediaUrl,
        caption: content || undefined,
        connectionId: contact.connectionId,
      });
    }
  } catch (e) {
    console.error("[flow] falha ao enviar:", e);
  }
}

function applyTag(contact: Contact, tagName: string) {
  if (!tagName) return;
  let tag = db.tags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
  if (!tag) {
    tag = { id: uid("t"), name: tagName, color: "#3FC8E4" };
    db.tags.push(tag);
  }
  if (!contact.tags.includes(tag.id)) contact.tags.push(tag.id);
}

// executa a partir de um node até atingir um ponto de espera (pergunta/botões),
// transferência ou fim. Define/limpa conv.flowState conforme necessário.
async function runFrom(flow: Flow, conv: Conversation, contact: Contact, fromNodeId?: string) {
  const vars = conv.flowState?.vars || {};
  let current = fromNodeId;
  const guard = new Set<string>();

  while (current && !guard.has(current)) {
    guard.add(current);
    const node = flow.nodes.find((n) => n.id === current);
    if (!node) break;

    switch (node.type) {
      case "message": {
        if (node.data.text) await emit(conv, contact, "text", node.data.text);
        for (const el of node.data.elements || []) {
          if (["image", "video", "audio", "file"].includes(el.type) && el.value) {
            await emit(conv, contact, el.type, "", el.value);
          }
        }
        break;
      }
      case "image":
      case "video":
      case "audio":
        await emit(conv, contact, node.type, node.data.caption || "", node.data.url);
        break;
      case "question":
        await emit(conv, contact, "text", node.data.text || "");
        conv.flowState = { flowId: flow.id, nodeId: node.id, vars };
        scheduleNoReply(flow, conv, contact, node); // agenda caminho "não respondeu"
        return; // espera resposta
      case "buttons": {
        const buttons = node.data.buttons || [];
        const opts = buttons.map((b: any, i: number) => `${i + 1}. ${b.label}`).join("\n");
        await emit(conv, contact, "text", `${node.data.text || ""}\n\n${opts}`.trim());
        conv.flowState = { flowId: flow.id, nodeId: node.id, vars };
        return; // espera escolha
      }
      case "tag":
        applyTag(contact, node.data.tag || "");
        break;
      case "webhook":
        if (node.data.url) {
          fetch(node.data.url, {
            method: node.data.method || "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contact, vars }),
          }).catch(() => {});
        }
        break;
      case "transfer":
        if (node.data.note) await emit(conv, contact, "text", "");
        conv.botPaused = true;
        conv.assignedTo = "Atendente";
        conv.flowState = undefined;
        return;
      case "delay": {
        // agenda a continuação após X minutos (processo de longa duração)
        const next = nextNodeId(flow, node.id);
        conv.flowState = { flowId: flow.id, nodeId: node.id, vars };
        const mult = node.data.unit === "segundos" ? 1000 : node.data.unit === "horas" ? 3600000 : 60000;
        const ms = Math.max(0, Number(node.data.minutes || 0)) * mult;
        if (next) {
          setTimeout(() => {
            const f = db.flows.find((x) => x.id === flow.id);
            const c = db.conversations.find((x) => x.id === conv.id);
            if (f && c && c.flowState?.nodeId === node.id) {
              c.flowState = undefined;
              runFrom(f, c, contact, next).catch(() => {});
            }
          }, ms);
        }
        return;
      }
      case "randomizer": {
        const outs = flow.edges.filter((e) => e.source === node.id);
        const pick = outs[Math.floor(Math.random() * outs.length)];
        current = pick?.target;
        continue;
      }
      case "gpt":
        await emit(conv, contact, "text", node.data.prompt ? `🤖 ${node.data.prompt}` : "");
        break;
      case "end":
        conv.flowState = undefined;
        return;
    }

    current = nextNodeId(flow, current);
  }
  conv.flowState = undefined;
}

// agenda o caminho "Se não responder" de um bloco de Pergunta (timeout configurável)
function scheduleNoReply(flow: Flow, conv: Conversation, contact: Contact, node: FlowNode) {
  const val = Number(node.data.waitValue || 0);
  if (!val) return; // sem tempo definido -> espera indefinidamente
  const unit = node.data.waitUnit || "minutos";
  const mult = unit === "segundos" ? 1000 : unit === "horas" ? 3600000 : 60000;
  const nid = node.id;
  setTimeout(() => {
    const f = db.flows.find((x) => x.id === flow.id);
    const c = db.conversations.find((x) => x.id === conv.id);
    if (!f || !c) return;
    // só dispara se o contato AINDA está esperando neste mesmo bloco (ou seja, não respondeu)
    if (c.flowState?.nodeId !== nid) return;
    const ct = db.contacts.find((x) => x.id === c.contactId);
    if (!ct) return;
    const next = nextNodeId(f, nid, "noreply") ?? nextNodeId(f, nid); // "não respondeu" ou próximo passo
    c.flowState = { flowId: f.id, nodeId: nid, vars: c.flowState?.vars };
    if (next) runFrom(f, c, ct, next).catch(() => {});
    else c.flowState = undefined;
  }, val * mult);
}

// inicia um fluxo do começo
export async function startFlow(flow: Flow, conv: Conversation, contact: Contact) {
  flow.executions = (flow.executions || 0) + 1;
  conv.flowState = undefined;
  await runFrom(flow, conv, contact, startNodeOf(flow)?.id);
}

// avança o fluxo a partir do ponto de espera, com base na resposta do lead
export async function advanceFlow(conv: Conversation, contact: Contact, reply: string) {
  const state = conv.flowState;
  if (!state) return false;
  const flow = db.flows.find((f) => f.id === state.flowId);
  const node = flow?.nodes.find((n) => n.id === state.nodeId);
  if (!flow || !node) {
    conv.flowState = undefined;
    return false;
  }

  let next: string | undefined;
  const vars = state.vars || {};

  if (node.type === "buttons") {
    const buttons = node.data.buttons || [];
    const idx = parseInt(reply.trim(), 10) - 1;
    let btn = !isNaN(idx) && buttons[idx] ? buttons[idx] : undefined;
    if (!btn) btn = buttons.find((b: any) => reply.toLowerCase().includes((b.label || "").toLowerCase()));
    next = nextNodeId(flow, node.id, btn?.id);
  } else if (node.type === "question") {
    if (node.data.saveTo) vars[node.data.saveTo] = reply;
    // respondeu -> saída "respondeu"; senão, próximo passo
    next = nextNodeId(flow, node.id, "answered") ?? nextNodeId(flow, node.id);
  } else {
    next = nextNodeId(flow, node.id);
  }

  // mantém as variáveis acumuladas para o runFrom ler
  conv.flowState = { flowId: flow.id, nodeId: node.id, vars };
  await runFrom(flow, conv, contact, next);
  return true;
}

// Decide o que fazer quando chega uma mensagem do lead:
// 1) se há fluxo em andamento -> avança
// 2) senão, palavra-chave -> inicia o fluxo daquela palavra (pode repetir)
// 3) senão, se o contato AINDA não recebeu o fluxo de boas-vindas -> inicia (1x só)
export async function handleInboundForFlow(conv: Conversation, contact: Contact, text: string, _isFirstMessage: boolean) {
  if (conv.botPaused) return { handled: false };

  if (conv.flowState) {
    await advanceFlow(conv, contact, text);
    return { handled: true, via: "advance" };
  }

  const lower = (text || "").toLowerCase();
  const kw = db.keywords.find((k) => {
    if (!lower) return false;
    if (k.matchType === "exact") return lower === k.word.toLowerCase();
    if (k.matchType === "starts") return lower.startsWith(k.word.toLowerCase());
    return lower.includes(k.word.toLowerCase());
  });

  // palavra-chave: sempre pode disparar (de propósito, pode repetir)
  if (kw?.flowId) {
    const flow = db.flows.find((f) => f.id === kw.flowId);
    if (flow) {
      await startFlow(flow, conv, contact);
      return { handled: true, via: "keyword", flow: flow.name };
    }
  }

  // fluxo padrão de boas-vindas: SÓ UMA VEZ por contato (não repete a cada mensagem)
  if (!contact.welcomeSent) {
    const flow = db.flows.find((f) => f.isDefault && f.status === "published");
    if (flow) {
      contact.welcomeSent = true; // trava: não dispara de novo
      await startFlow(flow, conv, contact);
      return { handled: true, via: "default", flow: flow.name };
    }
  }

  return { handled: false };
}

// Compat: execução simples a partir do início (usado por testes/campanha sem conversa)
export async function runFlow(flow: Flow, contact: { phone: string; name: string }) {
  const conv =
    db.conversations.find((c) => {
      const ct = db.contacts.find((x) => x.id === c.contactId);
      return ct?.phone === contact.phone;
    }) ||
    (() => {
      const c: Conversation = {
        id: uid("cv"),
        contactId: db.contacts.find((x) => x.phone === contact.phone)?.id || uid("ct"),
        contactName: contact.name,
        status: "open",
        botPaused: false,
        lastMessageAt: new Date().toISOString(),
        unread: 0,
        preview: "",
        messages: [],
      };
      db.conversations.unshift(c);
      return c;
    })();
  const ct = db.contacts.find((x) => x.id === conv.contactId) || { id: conv.contactId, name: contact.name, phone: contact.phone, tags: [], subscribedAt: new Date().toISOString() };
  await startFlow(flow, conv, ct as Contact);
  return { steps: conv.messages.slice(-6).map((m) => ({ nodeId: "", type: m.type, action: m.content || `[${m.type}]` })) };
}
