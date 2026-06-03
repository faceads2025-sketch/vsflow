import { NextResponse } from "next/server";
import { db } from "@/lib/mock-data";
import { getConfig } from "@/lib/integration-config";

export async function GET() {
  const conns = getConfig().connections;
  const list = db.conversations
    .slice()
    .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt))
    .map((c) => {
      const contact = db.contacts.find((x) => x.id === c.contactId);
      const conn = conns.find((k) => k.id === contact?.connectionId);
      return {
        ...c,
        phone: contact?.phone,
        email: contact?.email,
        campaignId: contact?.campaignId,
        tagIds: contact?.tags || [],
        subscribedAt: contact?.subscribedAt,
        pipelineColumnId: contact?.pipelineColumnId,
        connectionId: contact?.connectionId,
        connectionLabel: conn?.label || null,
      };
    });
  return NextResponse.json(list);
}

export const dynamic = "force-dynamic";
