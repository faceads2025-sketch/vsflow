import { NextResponse } from "next/server";
import { waStatus } from "@/lib/wa-client";
import { zapiConfigured, zapiStatus, zapiQrCode, zapiPhone } from "@/lib/zapi";

export const dynamic = "force-dynamic";

const MODE = (process.env.WHATSAPP_MODE || "mock").toLowerCase();

export async function GET() {
  if (MODE === "zapi") {
    if (!zapiConfigured) {
      return NextResponse.json({ status: "offline", qr: null, phone: null, queue: null, provider: "zapi" });
    }
    try {
      const st = await zapiStatus();
      const connected = st?.connected === true || st?.smartphoneConnected === true;
      let qr: string | null = null;
      let phone: string | null = null;
      if (connected) {
        phone = await zapiPhone().catch(() => null);
      } else {
        qr = await zapiQrCode().catch(() => null);
      }
      return NextResponse.json({
        status: connected ? "connected" : qr ? "qr" : "disconnected",
        qr,
        phone,
        queue: null,
        provider: "zapi",
      });
    } catch {
      return NextResponse.json({ status: "offline", qr: null, phone: null, queue: null, provider: "zapi" });
    }
  }

  // modo web (Baileys gateway)
  return NextResponse.json(await waStatus());
}
