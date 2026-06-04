import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

// Pausa/reativa a automação (atendente assume ou devolve para o bot).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const conv = db.conversations.find((c) => c.id === params.id);
  if (!conv) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  conv.botPaused = !conv.botPaused;
  if (conv.botPaused) {
    // atendente assumiu -> para a automação por completo
    conv.assignedTo = "Atendente";
    conv.flowState = undefined; // encerra qualquer fluxo em andamento (não avança mais)
  } else {
    // devolveu para o bot
    conv.assignedTo = undefined;
  }
  return NextResponse.json({ botPaused: conv.botPaused });
}

export const dynamic = "force-dynamic";
