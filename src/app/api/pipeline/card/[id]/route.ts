import { NextRequest, NextResponse } from "next/server";
import { db, uid } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

// GET: detalhes do pedido do contato + os áudios que o CLIENTE mandou (para escolher o comprovante).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const contact = db.contacts.find((c) => c.id === params.id);
  if (!contact) return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 });
  const conv = db.conversations.find((cv) => cv.contactId === contact.id);
  const clientAudios = (conv?.messages || [])
    .filter((m) => m.type === "audio" && m.direction === "inbound" && m.mediaUrl)
    .map((m) => ({ url: m.mediaUrl as string, at: m.createdAt }));

  return NextResponse.json({
    contactId: contact.id,
    deliveryStatus: contact.deliveryStatus || null,
    shopeeDate: contact.shopeeDate || null,
    orderValue: contact.orderValue ?? null,
    commitmentAudioUrl: contact.commitmentAudioUrl || null,
    clientAudios,
  });
}

// POST: salva detalhes do pedido. Se marcar o áudio de compromisso, aplica a tag de "comprometeu pagar".
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const contact = db.contacts.find((c) => c.id === params.id);
  if (!contact) return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 });
  const body = await req.json().catch(() => ({}));

  if ("deliveryStatus" in body) contact.deliveryStatus = body.deliveryStatus || undefined;
  if ("shopeeDate" in body) contact.shopeeDate = body.shopeeDate || undefined;
  if ("orderValue" in body) contact.orderValue = body.orderValue != null && !isNaN(Number(body.orderValue)) ? Number(body.orderValue) : undefined;

  if ("commitmentAudioUrl" in body) {
    contact.commitmentAudioUrl = body.commitmentAudioUrl || undefined;
    // marcar o áudio = aplica a tag de compromisso de pagamento
    if (contact.commitmentAudioUrl) {
      const name = "💰 Comprometeu pagar";
      let tag = db.tags.find((t) => t.name === name);
      if (!tag) { tag = { id: uid("t"), name, color: "#10B981" }; db.tags.push(tag); }
      if (!contact.tags.includes(tag.id)) contact.tags.push(tag.id);
    }
  }

  return NextResponse.json({ ok: true });
}
