import { NextRequest, NextResponse } from "next/server";
import { uid, upsertConversation } from "@/lib/mock-data";
import { handleInboundForFlow } from "@/lib/flow-engine";

// Verificação do webhook (handshake da Meta).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === (process.env.WHATSAPP_VERIFY_TOKEN || "conversaflow-verify-token")) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Recebe mensagens da WhatsApp Cloud API.
export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));

  // Extrai mensagem (formato Cloud API). Aceita também payload simplificado para testes.
  const change = payload?.entry?.[0]?.changes?.[0]?.value;
  const incoming = change?.messages?.[0];
  const from = incoming?.from || payload.from;
  const text = incoming?.text?.body || payload.text || "";
  const mediaType = payload.type && payload.type !== "text" ? payload.type : null;
  const mediaUrl = payload.mediaUrl;

  // precisa ter pelo menos texto OU mídia
  if (!from || (!text && !mediaUrl)) {
    return NextResponse.json({ status: "ignored" });
  }

  const preview = text || (mediaType ? `[${mediaType}]` : "");

  // localiza/cria contato e conversa (com nome e foto do WhatsApp, se vierem)
  const { contact, conv } = upsertConversation({
    phone: from,
    name: payload.name || incoming?.pushName,
    avatar: payload.avatar,
    preview,
    timestamp: new Date().toISOString(),
    unreadInc: 1,
  });

  conv.messages.push({
    id: uid("msg"),
    direction: "inbound",
    type: (mediaType || "text") as any,
    content: text || (mediaType ? `[${mediaType}]` : ""),
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
