import { NextResponse } from "next/server";
import { waStatus } from "@/lib/wa-client";
import { zapiStatus, zapiQrCode, zapiPhone } from "@/lib/zapi";
import { getConfig } from "@/lib/integration-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = getConfig();
  const MODE = cfg.mode;

  if (MODE === "zapi") {
    const connections = await Promise.all(
      cfg.connections.map(async (conn) => {
        if (!conn.instanceId || !conn.token) {
          return { id: conn.id, label: conn.label, status: "offline" as const, qr: null, phone: null };
        }
        try {
          const st = await zapiStatus(conn.id);
          const connected = st?.connected === true || st?.smartphoneConnected === true;
          let qr: string | null = null;
          let phone: string | null = null;
          if (connected) phone = await zapiPhone(conn.id).catch(() => null);
          else qr = await zapiQrCode(conn.id).catch(() => null);
          return { id: conn.id, label: conn.label, status: connected ? "connected" : qr ? "qr" : "disconnected", qr, phone };
        } catch {
          return { id: conn.id, label: conn.label, status: "offline" as const, qr: null, phone: null };
        }
      }),
    );
    return NextResponse.json({ provider: "zapi", connections });
  }

  if (MODE === "web") {
    return NextResponse.json({ ...(await waStatus()), provider: "web" });
  }

  return NextResponse.json({ status: MODE === "cloud" ? "connected" : "disconnected", qr: null, phone: null, queue: null, provider: MODE });
}
