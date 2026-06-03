import { NextRequest, NextResponse } from "next/server";
import { uid, upsertConversation } from "@/lib/mock-data";
import { handleInboundForFlow } from "@/lib/flow-engine";

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

  const isFirstMessage = conv.messages.length === 1;
  const result = await handleInboundForFlow(conv, contact, text, isFirstMessage);

  return NextResponse.json({ status: "received", ...result });
}

export const dynamic = "force-dynamic";
