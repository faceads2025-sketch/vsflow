import { NextRequest, NextResponse } from "next/server";
import { db, uid } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(db.templates);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const template = {
    id: uid("tp"),
    name: body.name || "novo_modelo",
    category: (body.category || "MARKETING") as any,
    language: body.language || "pt_BR",
    status: "PENDING" as const,
    body: body.body || "",
    header: body.header,
    footer: body.footer,
  };
  db.templates.unshift(template);
  return NextResponse.json(template, { status: 201 });
}
