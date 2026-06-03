import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rotas públicas (não exigem login):
// - /login e API de auth
// - webhooks (Z-API / Meta chamam de fora)
// - /api/files (o Z-API precisa baixar a mídia)
// - /c/ (landing pública de campanha)
const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/zapi/webhook",
  "/api/webhook/whatsapp",
  "/api/files",
  "/c/",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET || "conversaflow-dev-secret";
  const authed = req.cookies.get("cf_auth")?.value === secret;
  if (authed) return NextResponse.next();

  // API protegida -> 401; página -> redireciona pro login
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // roda em tudo, menos assets estáticos
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
