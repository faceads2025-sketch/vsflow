// Cliente Z-API (https://z-api.io) — WhatsApp gerenciado na nuvem deles.
// Não precisa rodar gateway/Baileys local; o Z-API cuida da sessão, QR e mídia.
//
// Env necessárias:
//   ZAPI_INSTANCE_ID   - ID da instância
//   ZAPI_TOKEN         - token da instância
//   ZAPI_CLIENT_TOKEN  - token de segurança da conta (header Client-Token)

const INSTANCE = process.env.ZAPI_INSTANCE_ID || "";
const TOKEN = process.env.ZAPI_TOKEN || "";
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || "";

const BASE = `https://api.z-api.io/instances/${INSTANCE}/token/${TOKEN}`;

export const zapiConfigured = !!(INSTANCE && TOKEN);

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (CLIENT_TOKEN) h["Client-Token"] = CLIENT_TOKEN;
  return h;
}

async function post(path: string, body: any) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Z-API ${path}: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: headers(), cache: "no-store" });
  return res.json().catch(() => ({}));
}

// só dígitos com DDI (ex: 5511999998888)
function normalizePhone(phone: string) {
  return (phone || "").replace(/\D/g, "");
}

export async function zapiSendText(phone: string, message: string) {
  return post("/send-text", { phone: normalizePhone(phone), message });
}

export async function zapiSendMedia(opts: {
  phone: string;
  type: "image" | "video" | "audio" | "document";
  url: string;
  caption?: string;
  fileName?: string;
}) {
  const phone = normalizePhone(opts.phone);
  switch (opts.type) {
    case "image":
      return post("/send-image", { phone, image: opts.url, caption: opts.caption });
    case "video":
      return post("/send-video", { phone, video: opts.url, caption: opts.caption });
    case "audio":
      // Z-API entrega como nota de voz automaticamente (sem precisar de ffmpeg)
      return post("/send-audio", { phone, audio: opts.url });
    case "document": {
      const ext = (opts.fileName?.split(".").pop() || "pdf").toLowerCase();
      return post(`/send-document/${ext}`, { phone, document: opts.url, fileName: opts.fileName || `arquivo.${ext}` });
    }
  }
}

// status de conexão da instância
export async function zapiStatus() {
  // { connected: boolean, smartphoneConnected: boolean, ... }
  return get("/status");
}

// QR code (base64) para parear o número
export async function zapiQrCode(): Promise<string | null> {
  // retorna { value: "data:image/png;base64,..." } quando precisa parear
  const data = await get("/qr-code/image");
  return data?.value || null;
}

// telefone conectado
export async function zapiPhone(): Promise<string | null> {
  const d = await get("/device");
  return d?.phone || null;
}
