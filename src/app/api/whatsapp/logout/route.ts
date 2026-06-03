import { NextResponse } from "next/server";
import { waLogout } from "@/lib/wa-client";

export async function POST() {
  try {
    return NextResponse.json(await waLogout());
  } catch (e: any) {
    return NextResponse.json({ error: "Gateway offline" }, { status: 503 });
  }
}
