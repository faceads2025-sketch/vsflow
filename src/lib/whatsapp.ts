// Camada de envio de mensagens. Três modos (env WHATSAPP_MODE):
//   - "web"   -> WhatsApp Web não-oficial (Baileys) via gateway local
//   - "cloud" -> WhatsApp Cloud API oficial (Graph API)
//   - "mock"  -> apenas loga no console (default p/ desenvolvimento)

import { waSend } from "./wa-client";

const MODE = (process.env.WHATSAPP_MODE || "mock").toLowerCase();

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v20.0";
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const isMock = MODE === "mock" || (MODE === "cloud" && (!TOKEN || !PHONE_ID));

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
  if (MODE === "web") {
    return waSend({ to, type: "text", text: body });
  }
  if (isMock) {
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
  if (MODE === "web") {
    // WhatsApp Web não usa templates aprovados; envia como texto simples.
    return waSend({ to, type: "text", text: `[${template}]` });
  }
  if (isMock) {
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
  // resolve URLs relativas (uploads locais) para absolutas
  const absUrl = url.startsWith("http") ? url : `${process.env.APP_URL || "http://localhost:3000"}${url}`;

  if (MODE === "web") {
    return waSend({ to, type, url: absUrl, caption });
  }
  if (isMock) {
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

export { isMock as whatsappIsMock, MODE as whatsappMode };
