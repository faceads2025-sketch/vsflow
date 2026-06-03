import { NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

export async function GET() {
  const list = db.conversations
    .slice()
    .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt))
    .map((c) => {
      const contact = db.contacts.find((x) => x.id === c.contactId);
      return { ...c, phone: contact?.phone, pipelineColumnId: contact?.pipelineColumnId };
    });
  return NextResponse.json(list);
}

export const dynamic = "force-dynamic";
