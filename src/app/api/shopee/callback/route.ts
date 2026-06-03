import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/shopee";

export const dynamic = "force-dynamic";

// A Shopee redireciona pra cá após o lojista autorizar: ?code=..&shop_id=..
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const code = sp.get("code");
  const shopId = sp.get("shop_id");
  const origin = process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : new URL(req.url).origin);

  if (!code || !shopId) {
    return NextResponse.redirect(`${origin}/orders?shopee=erro`);
  }
  try {
    await exchangeCode(code, shopId);
    return NextResponse.redirect(`${origin}/orders?shopee=ok`);
  } catch (e: any) {
    return NextResponse.redirect(`${origin}/orders?shopee=erro&msg=${encodeURIComponent(e.message)}`);
  }
}
