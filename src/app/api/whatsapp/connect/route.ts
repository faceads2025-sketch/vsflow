import { NextResponse } from "next/server";
import { waConnect } from "@/lib/wa-client";

export async function POST() {
  try {
    return NextResponse.json(await waConnect());
  } catch (e: any) {
    return NextResponse.json({ error: "Gateway WhatsApp Web offline. Rode `npm run wa`." }, { status: 503 });
  }
}
