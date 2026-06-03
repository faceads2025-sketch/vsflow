import { NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

export async function GET() {
  const list = db.conversations
    .slice()
    .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));
  return NextResponse.json(list);
}
