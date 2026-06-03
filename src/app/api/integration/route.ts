import { NextRequest, NextResponse } from "next/server";
import { getConfig, saveConfig, type WhatsAppMode } from "@/lib/integration-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const c = getConfig();
  return NextResponse.json(c);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const modes: WhatsAppMode[] = ["mock", "zapi", "web", "cloud"];
  const patch: any = {};
  if (body.mode && modes.includes(body.mode)) patch.mode = body.mode;
  if (typeof body.zapiInstanceId === "string") patch.zapiInstanceId = body.zapiInstanceId.trim();
  if (typeof body.zapiToken === "string") patch.zapiToken = body.zapiToken.trim();
  if (typeof body.zapiClientToken === "string") patch.zapiClientToken = body.zapiClientToken.trim();
  const next = saveConfig(patch);
  return NextResponse.json(next);
}
