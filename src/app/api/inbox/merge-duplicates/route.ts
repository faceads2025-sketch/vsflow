import { NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const last8 = (p: string) => (p || "").replace(/\D/g, "").slice(-8);

// Junta contatos/conversas duplicados (mesmo telefone pelos últimos 8 dígitos) em um só,
// preservando o histórico de mensagens, etiquetas e status do pipeline.
export async function POST() {
  const groups = new Map<string, typeof db.contacts>();
  for (const c of db.contacts) {
    const k = last8(c.phone);
    if (!k || k.length < 8) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
  }

  let mergedContacts = 0;
  let mergedGroups = 0;

  for (const [, list] of groups) {
    if (list.length < 2) continue;
    mergedGroups++;

    // contato/conversa "principal" = o que tem mais mensagens
    const withConv = list.map((c) => ({ c, conv: db.conversations.find((cv) => cv.contactId === c.id) }));
    withConv.sort((a, b) => (b.conv?.messages.length || 0) - (a.conv?.messages.length || 0));
    const primary = withConv[0];
    const pConv = primary.conv;

    for (let i = 1; i < withConv.length; i++) {
      const dup = withConv[i];
      // une etiquetas
      for (const t of dup.c.tags || []) if (!primary.c.tags.includes(t)) primary.c.tags.push(t);
      // une campos (mantém o que o principal já tem; senão pega do duplicado)
      primary.c.welcomeSent = primary.c.welcomeSent || dup.c.welcomeSent;
      primary.c.avatar = primary.c.avatar || dup.c.avatar;
      primary.c.pipelineColumnId = primary.c.pipelineColumnId || dup.c.pipelineColumnId;
      primary.c.connectionId = primary.c.connectionId || dup.c.connectionId;
      primary.c.campaignId = primary.c.campaignId || dup.c.campaignId;
      if ((!primary.c.name || primary.c.name === primary.c.phone) && dup.c.name && dup.c.name !== dup.c.phone) {
        primary.c.name = dup.c.name;
      }
      // une mensagens
      if (dup.conv && pConv) {
        pConv.messages.push(...dup.conv.messages);
        pConv.botPaused = pConv.botPaused || dup.conv.botPaused;
        const idx = db.conversations.findIndex((cv) => cv.id === dup.conv!.id);
        if (idx >= 0) db.conversations.splice(idx, 1);
      }
      // remove o contato duplicado
      const ci = db.contacts.findIndex((x) => x.id === dup.c.id);
      if (ci >= 0) db.contacts.splice(ci, 1);
      mergedContacts++;
    }

    // ordena mensagens por tempo, remove repetidas, atualiza preview/nome
    if (pConv) {
      const seen = new Set<string>();
      pConv.messages = pConv.messages
        .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
      const lastMsg = pConv.messages[pConv.messages.length - 1];
      pConv.contactName = primary.c.name;
      pConv.avatar = primary.c.avatar;
      if (lastMsg) {
        pConv.preview = lastMsg.content || `[${lastMsg.type}]`;
        pConv.lastMessageAt = lastMsg.createdAt;
      }
    }
  }

  return NextResponse.json({ ok: true, mergedGroups, mergedContacts });
}
