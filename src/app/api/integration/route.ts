import { NextRequest, NextResponse } from "next/server";
import { getConfig, saveConfig, type WhatsAppMode, type Connection } from "@/lib/integration-config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getConfig());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const modes: WhatsAppMode[] = ["mock", "zapi", "web", "cloud"];
  const patch: any = {};
  if (body.mode && modes.includes(body.mode)) patch.mode = body.mode;
  if (typeof body.zapiClientToken === "string") patch.zapiClientToken = body.zapiClientToken.trim();
  if (Array.isArray(body.connections)) {
    patch.connections = body.connections
      .filter((c: any) => c && (c.instanceId || c.token || c.label))
      .map((c: any, i: number): Connection => ({
        id: c.id || `conn${Date.now()}${i}`,
        label: (c.label || `Número ${i + 1}`).trim(),
        instanceId: (c.instanceId || "").trim(),
        token: (c.token || "").trim(),
      }));
  }
  return NextResponse.json(saveConfig(patch));
}
