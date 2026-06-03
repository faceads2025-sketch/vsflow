import { NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

// Metadados úteis para dropdowns/filtros no front.
export async function GET() {
  return NextResponse.json({
    tags: db.tags,
    campaigns: db.campaigns.map((c) => ({ id: c.id, name: c.name })),
    flows: db.flows.map((f) => ({ id: f.id, name: f.name })),
    sequences: db.sequences.map((s) => ({ id: s.id, name: s.name })),
  });
}

export const dynamic = "force-dynamic";
