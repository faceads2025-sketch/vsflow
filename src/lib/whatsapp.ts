// Camada de envio de mensagens. Modos (env WHATSAPP_MODE):
//   - "zapi"  -> Z-API (WhatsApp gerenciado na nuvem; recomendado)
//   - "web"   -> WhatsApp Web não-oficial (Baileys) via gateway local
//   - "cloud" -> WhatsApp Cloud API oficial (Graph API)
//   - "mock"  -> apenas loga no console (default p/ desenvolvimento)

import { waSend } from "./wa-client";
import { zapiSendText, zapiSendMedia } from "./zapi";
import { getConfig } from "./integration-config";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v20.0";
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// modo lido da config editável (fallback p/ env dentro do getConfig)
function getMode() {
  return (getConfig().mode || "mock").toLowerCase();
}
function mockNow(mode: string) {
  return mode === "mock" || (mode === "cloud" && (!TOKEN || !PHONE_ID));
}

interface SendTextArgs {
  to: string;
  body: string;
}

interface SendTemplateArgs {
  to: string;
  template: string;
  language?: string;
  components?: any[];
}

async function graph(path: string, payload: any) {
  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp API error: ${res.status} ${err}`);
  }
  return res.json();
}

export async function sendText({ to, body }: SendTextArgs) {
  const MODE = getMode();
  if (MODE === "zapi") {
    return zapiSendText(to, body);
  }
  if (MODE === "web") {
    return waSend({ to, type: "text", text: body });
  }
  if (mockNow(MODE)) {
    console.log(`[WhatsApp mock] -> ${to}: ${body}`);
    return { mock: true, to, body };
  }
  return graph(`${PHONE_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
}

export async function sendTemplate({ to, template, language = "pt_BR", components }: SendTemplateArgs) {
  const MODE = getMode();
  if (MODE === "zapi") {
    return zapiSendText(to, `[${template}]`); // Z-API não usa templates aprovados
  }
  if (MODE === "web") {
    // WhatsApp Web não usa templates aprovados; envia como texto simples.
    return waSend({ to, type: "text", text: `[${template}]` });
  }
  if (mockNow(MODE)) {
    console.log(`[WhatsApp mock template] -> ${to}: ${template}`);
    return { mock: true, to, template };
  }
  return graph(`${PHONE_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: template,
      language: { code: language },
      components,
    },
  });
}

export async function sendMedia({ to, type, url, caption }: { to: string; type: "image" | "video" | "audio" | "document"; url: string; caption?: string }) {
  // resolve URLs relativas para absolutas usando a URL pública (Z-API precisa baixar o arquivo)
  const publicUrl =
    process.env.APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000");
  let absUrl = url.startsWith("http") ? url : `${publicUrl}${url}`;
  // áudio: o app guarda MP3 (player), mas envia a versão OGG/OPUS irmã (nota de voz)
  if (type === "audio" && /\/api\/files\/.+\.mp3$/i.test(absUrl)) {
    absUrl = absUrl.replace(/\.mp3$/i, ".ogg");
  }
  const MODE = getMode();

  if (MODE === "zapi") {
    return zapiSendMedia({ phone: to, type, url: absUrl, caption });
  }
  if (MODE === "web") {
    return waSend({ to, type, url: absUrl, caption });
  }
  if (mockNow(MODE)) {
    console.log(`[WhatsApp mock ${type}] -> ${to}: ${url}`);
    return { mock: true, to, type, url };
  }
  return graph(`${PHONE_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type,
    [type]: { link: absUrl, ...(caption ? { caption } : {}) },
  });
}

export { getMode as whatsappMode };
