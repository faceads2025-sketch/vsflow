import { NextRequest, NextResponse } from "next/server";
import { uid, upsertConversation } from "@/lib/mock-data";
import { handleInboundForFlow } from "@/lib/flow-engine";

// guarda os últimos payloads crus para diagnóstico (GET nesta mesma rota)
const g = globalThis as unknown as { __zapiLast?: any[]; __zapiSeen?: string[] };
g.__zapiLast = g.__zapiLast || [];
g.__zapiSeen = g.__zapiSeen || [];

// evita processar a mesma mensagem 2x (Z-API reenvia o webhook se demorar a responder)
function alreadySeen(id?: string) {
  if (!id) return false;
  if (g.__zapiSeen!.includes(id)) return true;
  g.__zapiSeen!.unshift(id);
  g.__zapiSeen = g.__zapiSeen!.slice(0, 300);
  return false;
}

function mediaUrlOf(node: any): string | undefined {
  if (!node) return undefined;
  return node.imageUrl || node.videoUrl || node.audioUrl || node.documentUrl || node.stickerUrl || node.url || node.fileUrl;
}

// Webhook de mensagens recebidas do Z-API ("Ao receber").
export async function POST(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  // proteção opcional: se WEBHOOK_SECRET estiver definido, exige ?key=SECRET
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && sp.get("key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // qual número/conexão recebeu (configurado na URL do webhook do Z-API: ?inst=<id>)
  const connectionId = sp.get("inst") || undefined;

  const p = await req.json().catch(() => ({}));

  // registra para diagnóstico
  g.__zapiLast!.unshift({ at: new Date().toISOString(), keys: Object.keys(p), payload: p });
  g.__zapiLast = g.__zapiLast!.slice(0, 8);

  // ignora grupos, newsletter e atualizações de status (não são conversas 1:1)
  if (p.isGroup || p.isNewsletter || p.isStatusReply) return NextResponse.json({ status: "ignored", reason: "grupo/status" });

  // dedupe: ignora reenvios do mesmo messageId
  if (alreadySeen(p.messageId || p.id)) return NextResponse.json({ status: "duplicate" });

  const fromMe = p.fromMe === true; // mensagem que VOCÊ enviou (entra como "enviada")
  // o parceiro da conversa (NUNCA o seu número conectado, senão agrupa tudo errado)
  const phone: string = p.phone || p.participantPhone || "";
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
  // identidade do contato = o parceiro da conversa (chatName/photo), nunca o seu nome em msgs fromMe
  const { contact, conv } = upsertConversation({
    phone,
    name: p.chatName || p.senderName || p.notifyName,
    avatar: p.photo || (!fromMe ? p.senderPhoto : undefined),
    preview,
    timestamp: new Date().toISOString(),
    unreadInc: fromMe ? 0 : 1, // só conta não-lida pra mensagem recebida
  });

  if (connectionId) contact.connectionId = connectionId;

  conv.messages.push({
    id: uid("msg"),
    direction: fromMe ? "outbound" : "inbound",
    type: type as any,
    content: text || `[${type}]`,
    mediaUrl,
    status: "read",
    fromBot: false,
    createdAt: new Date().toISOString(),
  });
  conv.lastMessageAt = new Date().toISOString();
  conv.preview = preview;

  // só dispara automação/fluxo em mensagem RECEBIDA (não no que você mesmo envia)
  if (!fromMe) {
    const isFirstMessage = conv.messages.length === 1;
    handleInboundForFlow(conv, contact, text, isFirstMessage).catch((e) => console.error("[zapi] fluxo:", e));
  }

  return NextResponse.json({ status: "received", direction: fromMe ? "outbound" : "inbound", type });
}

// GET = inspeção dos últimos payloads recebidos (diagnóstico)
export async function GET() {
  return NextResponse.json({ count: g.__zapiLast!.length, last: g.__zapiLast });
}

export const dynamic = "force-dynamic";
