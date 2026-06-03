import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  const expected = process.env.AUTH_PASSWORD || "admin123";
  if (!password || password !== expected) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("cf_auth", process.env.AUTH_SECRET || "conversaflow-dev-secret", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
