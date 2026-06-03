import { NextRequest, NextResponse } from "next/server";
import { db, uid } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(db.contacts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || !body.phone) {
    return NextResponse.json({ error: "name e phone são obrigatórios" }, { status: 400 });
  }
  const contact = {
    id: uid("ct"),
    name: body.name,
    phone: body.phone,
    email: body.email,
    tags: body.tags ?? [],
    campaignId: body.campaignId,
    subscribedAt: new Date().toISOString(),
  };
  db.contacts.unshift(contact);
  return NextResponse.json(contact, { status: 201 });
}

export const dynamic = "force-dynamic";
