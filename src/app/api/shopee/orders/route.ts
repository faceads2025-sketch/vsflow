import { NextRequest, NextResponse } from "next/server";
import { getOrders, shopeeAuthorized } from "@/lib/shopee";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!shopeeAuthorized()) return NextResponse.json({ error: "Shopee não autorizado", orders: [] }, { status: 200 });
  const status = new URL(req.url).searchParams.get("status") || "";
  try {
    const orders = await getOrders(status);
    return NextResponse.json({ orders });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, orders: [] }, { status: 200 });
  }
}
