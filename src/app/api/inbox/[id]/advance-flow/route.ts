import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mock-data";
import { advanceFlow } from "@/lib/flow-engine";

export const dynamic = "force-dynamic";

// Avança manualmente a "segunda parte" do fluxo: roda como se o lead tivesse respondido,
// usando a última mensagem recebida (ou um texto enviado). Responde NA HORA e roda o
// fluxo em segundo plano (sem esperar o envio, pra não estourar timeout da requisição).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const conv = db.conversations.find((c) => c.id === params.id);
    if (!conv) return NextResponse.json({ ok: false, reason: "Conversa não encontrada." });
    const contact = db.contacts.find((c) => c.id === conv.contactId);
    if (!contact) return NextResponse.json({ ok: false, reason: "Contato não encontrado." });

    if (!conv.flowState) {
      return NextResponse.json({
        ok: false,
        reason:
          "Este contato NÃO está parado numa etapa aguardando resposta (o fluxo já terminou ou não tem um bloco \"Pergunta\"). Para ter \"segunda parte\", o fluxo precisa de um bloco Pergunta/Botões onde ele espera o lead responder.",
      });
    }

    // texto da resposta = o enviado, senão a última mensagem recebida do lead
    const lastInbound = [...conv.messages].reverse().find((m) => m.direction === "inbound");
    const text = ((body as any).reply ?? lastInbound?.content ?? "").toString();

    conv.botPaused = false; // garante que o bot consiga enviar
    // dispara em segundo plano (não espera o envio) -> requisição responde rápido
    advanceFlow(conv, contact, text).catch((e) => console.error("[advance-flow] erro:", e));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[advance-flow] fatal:", e);
    return NextResponse.json({ ok: false, reason: "Erro interno: " + String(e) });
  }
}
