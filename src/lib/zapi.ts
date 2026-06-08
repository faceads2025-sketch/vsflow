// Cliente Z-API (https://z-api.io) — suporta múltiplas conexões (números).
// As credenciais vêm da config (integration-config); cada chamada escolhe a conexão.

import { getConfig, getConnection } from "./integration-config";

function creds(connId?: string) {
  const conn = getConnection(connId);
  const c = getConfig();
  return { instance: conn?.instanceId || "", token: conn?.token || "", clientToken: c.zapiClientToken || "" };
}

export function zapiConfigured(connId?: string) {
  const { instance, token } = creds(connId);
  return !!(instance && token);
}

function headers(clientToken: string) {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) h["Client-Token"] = clientToken;
  return h;
}

async function post(path: string, body: any, connId?: string) {
  const { instance, token, clientToken } = creds(connId);
  const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}${path}`, {
    method: "POST",
    headers: headers(clientToken),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Z-API ${path}: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function get(path: string, connId?: string) {
  const { instance, token, clientToken } = creds(connId);
  const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}${path}`, {
    headers: headers(clientToken),
    cache: "no-store",
  });
  return res.json().catch(() => ({}));
}

const normalizePhone = (phone: string) => {
  const p = (phone || "").trim();
  // contatos @lid (identificador oculto de leads de anúncio): envia no formato que o
  // Z-API espera (mantém os dígitos + "@lid"), em vez de virar só dígitos inválidos.
  if (p.includes("@")) return p.replace(/[^0-9a-z@.]/gi, "");
  return p.replace(/\D/g, "");
};

export async function zapiSendText(phone: string, message: string, connId?: string) {
  const delayTyping = Math.min(6, Math.max(1, Math.round(message.length / 25)));
  return post("/send-text", { phone: normalizePhone(phone), message, delayTyping }, connId);
}

export async function zapiSendMedia(opts: {
  phone: string;
  type: "image" | "video" | "audio" | "document";
  url: string;
  caption?: string;
  fileName?: string;
  connId?: string;
}) {
  const phone = normalizePhone(opts.phone);
  switch (opts.type) {
    case "image":
      return post("/send-image", { phone, image: opts.url, caption: opts.caption }, opts.connId);
    case "video":
      return post("/send-video", { phone, video: opts.url, caption: opts.caption }, opts.connId);
    case "audio":
      return post("/send-audio", { phone, audio: opts.url }, opts.connId);
    case "document": {
      const ext = (opts.fileName?.split(".").pop() || "pdf").toLowerCase();
      return post(`/send-document/${ext}`, { phone, document: opts.url, fileName: opts.fileName || `arquivo.${ext}` }, opts.connId);
    }
  }
}

export async function zapiStatus(connId?: string) {
  return get("/status", connId);
}
export async function zapiQrCode(connId?: string): Promise<string | null> {
  const data = await get("/qr-code/image", connId);
  return data?.value || null;
}
export async function zapiPhone(connId?: string): Promise<string | null> {
  const d = await get("/device", connId);
  return d?.phone || null;
}
