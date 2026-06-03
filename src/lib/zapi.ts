// Cliente Z-API (https://z-api.io) — WhatsApp gerenciado na nuvem deles.
// Credenciais vêm da config editável (integration-config), com fallback p/ env.

import { getConfig } from "./integration-config";

function creds() {
  const c = getConfig();
  return { instance: c.zapiInstanceId || "", token: c.zapiToken || "", clientToken: c.zapiClientToken || "" };
}

export function zapiConfigured() {
  const { instance, token } = creds();
  return !!(instance && token);
}

function base() {
  const { instance, token } = creds();
  return `https://api.z-api.io/instances/${instance}/token/${token}`;
}

function headers() {
  const { clientToken } = creds();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) h["Client-Token"] = clientToken;
  return h;
}

async function post(path: string, body: any) {
  const res = await fetch(`${base()}${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Z-API ${path}: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function get(path: string) {
  const res = await fetch(`${base()}${path}`, { headers: headers(), cache: "no-store" });
  return res.json().catch(() => ({}));
}

// só dígitos com DDI (ex: 5511999998888)
function normalizePhone(phone: string) {
  return (phone || "").replace(/\D/g, "");
}

export async function zapiSendText(phone: string, message: string) {
  // delayTyping: mostra "digitando..." por alguns segundos antes de enviar (mais humano)
  const delayTyping = Math.min(6, Math.max(1, Math.round(message.length / 25)));
  return post("/send-text", { phone: normalizePhone(phone), message, delayTyping });
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

export async function zapiStatus() {
  return get("/status");
}

export async function zapiQrCode(): Promise<string | null> {
  const data = await get("/qr-code/image");
  return data?.value || null;
}

export async function zapiPhone(): Promise<string | null> {
  const d = await get("/device");
  return d?.phone || null;
}
