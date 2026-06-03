import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const flow = db.flows.find((f) => f.id === params.id);
  if (!flow) return NextResponse.json({ error: "Fluxo não encontrado" }, { status: 404 });
  return NextResponse.json(flow);
}

// Salva nodes/edges do construtor visual
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const flow = db.flows.find((f) => f.id === params.id);
  if (!flow) return NextResponse.json({ error: "Fluxo não encontrado" }, { status: 404 });

  if (body.name !== undefined) flow.name = body.name;
  if (body.status !== undefined) flow.status = body.status;
  if (Array.isArray(body.nodes)) flow.nodes = body.nodes;
  if (Array.isArray(body.edges)) flow.edges = body.edges;
  flow.updatedAt = new Date().toISOString();

  return NextResponse.json(flow);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const idx = db.flows.findIndex((f) => f.id === params.id);
  if (idx >= 0) db.flows.splice(idx, 1);
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
