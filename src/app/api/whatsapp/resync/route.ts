import { NextResponse } from "next/server";

const GATEWAY = process.env.WA_GATEWAY_URL || "http://localhost:4001";

// Pede ao gateway para reenviar todas as conversas conhecidas (histórico + tempo real).
export async function POST() {
  try {
    const res = await fetch(`${GATEWAY}/resync`, { method: "POST" });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "Gateway WhatsApp Web offline. Rode `npm run wa`." }, { status: 503 });
  }
}

export const dynamic = "force-dynamic";
