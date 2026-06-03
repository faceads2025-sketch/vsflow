import { NextRequest, NextResponse } from "next/server";
import { db, uid } from "@/lib/mock-data";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  return NextResponse.json(db.campaigns);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "name é obrigatório" }, { status: 400 });
  }
  const campaign = {
    id: uid("c"),
    name: body.name,
    slug: slugify(body.name) + "-" + Math.floor(performance.now()).toString(36),
    description: body.description,
    active: true,
    flowId: body.flowId,
    participants: 0,
    executions: 0,
    ctr: 0,
    createdAt: new Date().toISOString(),
  };
  db.campaigns.unshift(campaign);
  return NextResponse.json(campaign, { status: 201 });
}
