import { NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

// Remove conversas/contatos de demonstração para o Inbox refletir só o WhatsApp real.
export async function POST() {
  db.conversations.length = 0;
  db.contacts.length = 0;
  return NextResponse.json({ ok: true });
}
