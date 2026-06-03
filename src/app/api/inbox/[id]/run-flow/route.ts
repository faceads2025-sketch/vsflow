import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mock-data";
import { startFlow } from "@/lib/flow-engine";

export const dynamic = "force-dynamic";

// Dispara um fluxo manualmente para o contato desta conversa.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { flowId } = await req.json().catch(() => ({}));
  const conv = db.conversations.find((c) => c.id === params.id);
  if (!conv) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  const contact = db.contacts.find((c) => c.id === conv.contactId);
  const flow = db.flows.find((f) => f.id === flowId);
  if (!contact || !flow) return NextResponse.json({ error: "Fluxo ou contato inválido" }, { status: 400 });

  // reativa o bot pra o fluxo poder enviar e roda em segundo plano
  conv.botPaused = false;
  startFlow(flow, conv, contact).catch((e) => console.error("[run-flow] erro:", e));
  return NextResponse.json({ ok: true, flow: flow.name });
}
