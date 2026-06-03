import { NextRequest, NextResponse } from "next/server";
import { db, uid } from "@/lib/mock-data";
import { enqueueBroadcast } from "@/lib/queue";
import type { Broadcast } from "@/lib/types";

export async function GET() {
  return NextResponse.json(db.broadcasts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const status = body.scheduledAt ? "scheduled" : body.draft ? "draft" : "sending";

  const broadcast: Broadcast = {
    id: uid("b"),
    name: body.name || "Nova transmissão",
    status: status as any,
    messageType: (body.messageType || "text") as any,
    content: body.content || "",
    scheduledAt: body.scheduledAt,
    recipients: body.recipients ?? db.contacts.length,
    delivered: 0,
  };
  db.broadcasts.unshift(broadcast);

  // enfileira disparos (respeitando API oficial / templates)
  if (status === "sending") {
    for (const c of db.contacts) {
      await enqueueBroadcast({ broadcastId: broadcast.id, to: c.phone, content: broadcast.content, templateId: body.templateId });
    }
    broadcast.status = "sent";
    broadcast.sentAt = new Date().toISOString();
    broadcast.delivered = broadcast.recipients;
  }

  return NextResponse.json(broadcast, { status: 201 });
}
