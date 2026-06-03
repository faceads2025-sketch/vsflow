import { NextRequest, NextResponse } from "next/server";
import { uid, upsertConversation } from "@/lib/mock-data";
import { handleInboundForFlow } from "@/lib/flow-engine";

// guarda os últimos payloads crus para diagnóstico (GET nesta mesma rota)
const g = globalThis as unknown as { __zapiLast?: any[] };
g.__zapiLast = g.__zapiLast || [];

function mediaUrlOf(node: any): string | undefined {
  if (!node) return undefined;
  return node.imageUrl || node.videoUrl || node.audioUrl || node.documentUrl || node.stickerUrl || node.url || node.fileUrl;
}

// Webhook de mensagens recebidas do Z-API ("Ao receber").
export async function POST(req: NextRequest) {
  const p = await req.json().catch(() => ({}));

  // registra para diagnóstico
  g.__zapiLast!.unshift({ at: new Date().toISOString(), keys: Object.keys(p), payload: p });
  g.__zapiLast = g.__zapiLast!.slice(0, 8);

  if (p.fromMe || p.isGroup) return NextResponse.json({ status: "ignored", reason: "fromMe/group" });

  const phone: string = p.phone || p.participantPhone || p.connectedPhone || "";
  if (!phone) return NextResponse.json({ status: "ignored", reason: "sem phone" });

  // extrai conteúdo / mídia (robusto a variações de campo do Z-API)
  let type = "text";
  let text = p.text?.message || p.body || "";
  let mediaUrl: string | undefined;
  if (p.image) { type = "image"; mediaUrl = mediaUrlOf(p.image); text = p.image.caption || ""; }
  else if (p.video) { type = "video"; mediaUrl = mediaUrlOf(p.video); text = p.video.caption || ""; }
  else if (p.audio || p.ptt) { type = "audio"; mediaUrl = mediaUrlOf(p.audio || p.ptt); }
  else if (p.document) { type = "file"; mediaUrl = mediaUrlOf(p.document); text = p.document.fileName || p.document.caption || ""; }
  else if (p.sticker) { type = "image"; mediaUrl = mediaUrlOf(p.sticker); }

  if (!text && !mediaUrl) return NextResponse.json({ status: "ignored", reason: "sem texto/midia", keys: Object.keys(p) });

  const preview = text || `[${type}]`;
  const { contact, conv } = upsertConversation({
    phone,
    name: p.senderName || p.chatName || p.notifyName,
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

  const isFirstMessage = conv.messages.length === 1;
  const result = await handleInboundForFlow(conv, contact, text, isFirstMessage);

  return NextResponse.json({ status: "received", type, hasMedia: !!mediaUrl, ...result });
}

// GET = inspeção dos últimos payloads recebidos (diagnóstico)
export async function GET() {
  return NextResponse.json({ count: g.__zapiLast!.length, last: g.__zapiLast });
}

export const dynamic = "force-dynamic";
