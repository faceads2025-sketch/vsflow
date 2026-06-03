import { NextRequest, NextResponse } from "next/server";
import { db, uid } from "@/lib/mock-data";
import { sendText, sendMedia } from "@/lib/whatsapp";

// Envia mensagem do atendente (saída).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const conv = db.conversations.find((c) => c.id === params.id);
  if (!conv) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const contact = db.contacts.find((c) => c.id === conv.contactId);
  if (contact) {
    if (body.type === "text") {
      await sendText({ to: contact.phone, body: body.content });
    } else if (body.mediaUrl) {
      await sendMedia({
        to: contact.phone,
        type: body.type === "file" ? "document" : body.type,
        url: body.mediaUrl,
        caption: body.content,
      });
    }
  }

  const msg = {
    id: uid("msg"),
    direction: "outbound" as const,
    type: (body.type || "text") as any,
    content: body.content || "",
    mediaUrl: body.mediaUrl,
    status: "sent" as const,
    fromBot: false,
    createdAt: new Date().toISOString(),
  };
  conv.messages.push(msg);
  conv.lastMessageAt = msg.createdAt;
  conv.preview = body.type === "text" ? body.content : `[${body.type}]`;
  return NextResponse.json(msg, { status: 201 });
}
