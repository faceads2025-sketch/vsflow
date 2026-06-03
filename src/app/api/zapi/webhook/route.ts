import { NextRequest, NextResponse } from "next/server";
import { db, uid, upsertConversation } from "@/lib/mock-data";
import { runFlow } from "@/lib/flow-engine";

// Webhook de mensagens recebidas do Z-API ("On message received").
// Configure no painel do Z-API apontando para: https://SEU_APP/api/zapi/webhook
export async function POST(req: NextRequest) {
  const p = await req.json().catch(() => ({}));

  // ignora mensagens enviadas por você e grupos
  if (p.fromMe || p.isGroup) return NextResponse.json({ status: "ignored" });

  const phone: string = p.phone || p.participantPhone || "";
  if (!phone) return NextResponse.json({ status: "ignored" });

  // extrai conteúdo / mídia
  let type = "text";
  let text = p.text?.message || "";
  let mediaUrl: string | undefined;
  if (p.image) { type = "image"; mediaUrl = p.image.imageUrl; text = p.image.caption || ""; }
  else if (p.audio) { type = "audio"; mediaUrl = p.audio.audioUrl; }
  else if (p.video) { type = "video"; mediaUrl = p.video.videoUrl; text = p.video.caption || ""; }
  else if (p.document) { type = "file"; mediaUrl = p.document.documentUrl; text = p.document.fileName || ""; }

  if (!text && !mediaUrl) return NextResponse.json({ status: "ignored" });

  const preview = text || `[${type}]`;
  const { contact, conv } = upsertConversation({
    phone,
    name: p.senderName || p.chatName,
    avatar: p.senderPhoto || p.photo,
    preview,
    timestamp: new Date().toISOString(),
    unreadInc: 1,
  });

  conv.messages.push({
    id: uid("msg"),
    direction: "inbound",
    type: type as any,
    content: text || `[${type}]`,
    mediaUrl,
    status: "read",
    fromBot: false,
    createdAt: new Date().toISOString(),
  });
  conv.lastMessageAt = new Date().toISOString();
  conv.preview = preview;

  if (conv.botPaused) return NextResponse.json({ status: "received", automation: "paused" });

  // automação por palavra-chave
  const lower = (text || "").toLowerCase();
  const kw = db.keywords.find((k) => {
    if (!lower) return false;
    if (k.matchType === "exact") return lower === k.word.toLowerCase();
    if (k.matchType === "starts") return lower.startsWith(k.word.toLowerCase());
    return lower.includes(k.word.toLowerCase());
  });

  let run = null;
  if (kw?.flowId) {
    const flow = db.flows.find((f) => f.id === kw.flowId);
    if (flow) {
      flow.executions += 1;
      run = await runFlow(flow, { phone: contact.phone, name: contact.name });
    }
  }

  return NextResponse.json({ status: "received", matchedKeyword: kw?.word ?? null, flowRun: run });
}

export const dynamic = "force-dynamic";
