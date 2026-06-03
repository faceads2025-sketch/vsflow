import { NextRequest, NextResponse } from "next/server";
import { db, uid } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(db.keywords);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const kw = {
    id: uid("k"),
    word: body.word,
    matchType: (body.matchType || "contains") as any,
    flowId: body.flowId,
  };
  db.keywords.unshift(kw);
  return NextResponse.json(kw, { status: 201 });
}
