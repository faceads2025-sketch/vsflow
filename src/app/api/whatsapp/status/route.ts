import { NextResponse } from "next/server";
import { waStatus } from "@/lib/wa-client";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await waStatus());
}
