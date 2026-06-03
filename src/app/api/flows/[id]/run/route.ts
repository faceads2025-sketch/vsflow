import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mock-data";
import { runFlow } from "@/lib/flow-engine";

// Executa o fluxo manualmente para um contato (teste).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const flow = db.flows.find((f) => f.id === params.id);
  if (!flow) return NextResponse.json({ error: "Fluxo não encontrado" }, { status: 404 });

  const contact = db.contacts.find((c) => c.id === body.contactId) ?? db.contacts[0];
  flow.executions += 1;
  const run = await runFlow(flow, { phone: contact.phone, name: contact.name });
  return NextResponse.json({ ok: true, run });
}

export const dynamic = "force-dynamic";
