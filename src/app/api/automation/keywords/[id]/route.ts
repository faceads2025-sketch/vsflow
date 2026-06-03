import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const idx = db.keywords.findIndex((k) => k.id === params.id);
  if (idx >= 0) db.keywords.splice(idx, 1);
  return NextResponse.json({ ok: true });
}
