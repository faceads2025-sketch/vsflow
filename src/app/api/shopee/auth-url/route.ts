import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/shopee";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const origin = process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : new URL(req.url).origin);
    const redirect = `${origin}/api/shopee/callback`;
    return NextResponse.json({ url: buildAuthUrl(redirect) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
