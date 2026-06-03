import { NextRequest, NextResponse } from "next/server";
import { getConfig, saveConfig } from "@/lib/integration-config";
import { shopeeConfigured, shopeeAuthorized } from "@/lib/shopee";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getConfig().shopee;
  return NextResponse.json({
    partnerId: s?.partnerId || "",
    partnerKey: s?.partnerKey ? "••••••••" : "",
    shopId: s?.shopId || "",
    configured: shopeeConfigured(),
    authorized: shopeeAuthorized(),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const cur = getConfig().shopee || { partnerId: "", partnerKey: "", shopId: "", accessToken: "", refreshToken: "", expireAt: 0 };
  saveConfig({
    shopee: {
      ...cur,
      partnerId: (body.partnerId ?? cur.partnerId).toString().trim(),
      // só atualiza a key se vier um valor real (não o mascarado)
      partnerKey: body.partnerKey && !body.partnerKey.includes("•") ? body.partnerKey.trim() : cur.partnerKey,
    },
  });
  return NextResponse.json({ ok: true });
}
