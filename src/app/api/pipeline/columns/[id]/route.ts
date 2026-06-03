import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const col = db.pipelineColumns.find((c) => c.id === params.id);
  if (!col) return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 });
  if (typeof body.name === "string") col.name = body.name;
  if (typeof body.color === "string") col.color = body.color;
  if (typeof body.order === "number") col.order = body.order;
  return NextResponse.json(col);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const idx = db.pipelineColumns.findIndex((c) => c.id === params.id);
  if (idx < 0) return NextResponse.json({ ok: true });
  db.pipelineColumns.splice(idx, 1);
  // move os leads dessa coluna para a primeira coluna restante
  const fallback = [...db.pipelineColumns].sort((a, b) => a.order - b.order)[0]?.id;
  db.contacts.forEach((c) => {
    if (c.pipelineColumnId === params.id) c.pipelineColumnId = fallback;
  });
  return NextResponse.json({ ok: true });
}
