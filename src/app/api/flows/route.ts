import { NextRequest, NextResponse } from "next/server";
import { db, uid } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(
    db.flows.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      status: f.status,
      isDefault: f.isDefault,
      executions: f.executions,
      ctr: f.ctr,
      updatedAt: f.updatedAt,
      nodeCount: f.nodes.length,
    })),
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const flow = {
    id: uid("f"),
    name: body.name || "Novo fluxo",
    description: body.description || "",
    isDefault: false,
    status: "draft" as const,
    executions: 0,
    ctr: 0,
    updatedAt: new Date().toISOString(),
    nodes: [
      { id: "start", type: "message" as const, position: { x: 80, y: 60 }, data: { text: "Olá! 👋" } },
    ],
    edges: [],
  };
  db.flows.unshift(flow);
  return NextResponse.json(flow, { status: 201 });
}

export const dynamic = "force-dynamic";
