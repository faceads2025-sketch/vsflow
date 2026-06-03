import { NextRequest, NextResponse } from "next/server";
import { db, uid } from "@/lib/mock-data";
import { runFlow } from "@/lib/flow-engine";

// Lead entra pelo link/QR da campanha -> salva origem e dispara o fluxo vinculado.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => ({}));
  const campaign = db.campaigns.find((c) => c.slug === params.slug);
  if (!campaign) {
    return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
  }

  // cria/recupera o contato com a campanha de origem
  let contact = db.contacts.find((c) => c.phone === body.phone);
  if (!contact) {
    contact = {
      id: uid("ct"),
      name: body.name || body.phone || "Novo lead",
      phone: body.phone || "+550000000000",
      tags: [],
      campaignId: campaign.id,
      subscribedAt: new Date().toISOString(),
    };
    db.contacts.unshift(contact);
  } else {
    contact.campaignId = campaign.id;
  }

  campaign.participants += 1;

  // dispara o fluxo automaticamente
  let run = null;
  if (campaign.flowId) {
    const flow = db.flows.find((f) => f.id === campaign.flowId);
    if (flow) {
      campaign.executions += 1;
      flow.executions += 1;
      run = await runFlow(flow, { phone: contact.phone, name: contact.name });
    }
  }

  return NextResponse.json({ ok: true, contact, campaign: campaign.name, flowRun: run });
}
