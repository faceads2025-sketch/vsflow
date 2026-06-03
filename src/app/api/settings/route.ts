import { NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({
    account: db.account,
    tags: db.tags,
    customFields: db.customFields,
    quickReplies: db.quickReplies,
    team: db.team,
    flows: db.flows.map((f) => ({ id: f.id, name: f.name, isDefault: f.isDefault })),
  });
}

export const dynamic = "force-dynamic";
