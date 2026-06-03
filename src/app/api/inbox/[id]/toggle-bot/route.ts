import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

// Pausa/reativa a automação (atendente assume ou devolve para o bot).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const conv = db.conversations.find((c) => c.id === params.id);
  if (!conv) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  conv.botPaused = !conv.botPaused;
  conv.assignedTo = conv.botPaused ? "Kennedy" : undefined;
  return NextResponse.json({ botPaused: conv.botPaused });
}
