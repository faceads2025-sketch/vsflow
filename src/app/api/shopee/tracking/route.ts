import { NextRequest, NextResponse } from "next/server";
import { getTracking } from "@/lib/shopee";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orderSn = new URL(req.url).searchParams.get("order_sn");
  if (!orderSn) return NextResponse.json({ error: "order_sn obrigatório" }, { status: 400 });
  try {
    const tracking = await getTracking(orderSn);
    return NextResponse.json({ tracking });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, tracking: "" });
  }
}
