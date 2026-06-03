import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

// Move um lead para outra coluna / posição (drag-and-drop ou troca de status no Inbox).
export async function POST(req: NextRequest) {
  const { contactId, columnId, order } = await req.json().catch(() => ({}));
  const contact = db.contacts.find((c) => c.id === contactId);
  if (!contact) return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 });
  if (!db.pipelineColumns.some((c) => c.id === columnId)) {
    return NextResponse.json({ error: "Coluna inválida" }, { status: 400 });
  }
  contact.pipelineColumnId = columnId;
  if (typeof order === "number") contact.pipelineOrder = order;
  return NextResponse.json({ ok: true });
}
