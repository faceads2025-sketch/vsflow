// Cliente HTTP para o gateway WhatsApp Web (processo `npm run wa`).

const GATEWAY = process.env.WA_GATEWAY_URL || "http://localhost:4001";

export async function waStatus() {
  try {
    const res = await fetch(`${GATEWAY}/status`, { cache: "no-store" });
    return await res.json();
  } catch {
    return { status: "offline", qr: null, phone: null, queue: null };
  }
}

export async function waConnect() {
  const res = await fetch(`${GATEWAY}/connect`, { method: "POST" });
  return res.json();
}

export async function waLogout() {
  const res = await fetch(`${GATEWAY}/logout`, { method: "POST" });
  return res.json();
}

export async function waSend(payload: {
  to: string;
  type?: "text" | "image" | "video" | "audio" | "document" | "file";
  text?: string;
  url?: string;
  caption?: string;
  fileName?: string;
}) {
  const res = await fetch(`${GATEWAY}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Falha no envio");
  return res.json();
}
