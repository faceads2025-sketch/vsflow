import { NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(db.webhooks);
}

export const dynamic = "force-dynamic";
