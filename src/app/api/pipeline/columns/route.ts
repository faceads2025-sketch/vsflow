import { NextRequest, NextResponse } from "next/server";
import { db, uid } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json([...db.pipelineColumns].sort((a, b) => a.order - b.order));
}

const COLORS = ["#3FC8E4", "#9A7BFF", "#F59E0B", "#EF4444", "#10B981", "#6366F1", "#EC4899", "#14B8A6"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const order = db.pipelineColumns.length;
  const col = {
    id: uid("col"),
    name: body.name || "Nova coluna",
    color: body.color || COLORS[order % COLORS.length],
    order,
  };
  db.pipelineColumns.push(col);
  return NextResponse.json(col, { status: 201 });
}
