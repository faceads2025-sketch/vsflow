// Configuração de integração do WhatsApp, editável pela interface e persistida em disco.
// No Railway, aponte DATA_DIR para o volume (ex: /data) p/ não perder ao redeployar.
// Env (WHATSAPP_MODE, ZAPI_*) servem de valor inicial/fallback.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "integration.json");

export type WhatsAppMode = "mock" | "zapi" | "web" | "cloud";

export interface IntegrationConfig {
  mode: WhatsAppMode;
  zapiInstanceId: string;
  zapiToken: string;
  zapiClientToken: string;
}

const g = globalThis as unknown as { __cfConfig?: IntegrationConfig };

function defaults(): IntegrationConfig {
  return {
    mode: ((process.env.WHATSAPP_MODE as WhatsAppMode) || "mock"),
    zapiInstanceId: process.env.ZAPI_INSTANCE_ID || "",
    zapiToken: process.env.ZAPI_TOKEN || "",
    zapiClientToken: process.env.ZAPI_CLIENT_TOKEN || "",
  };
}

export function getConfig(): IntegrationConfig {
  if (g.__cfConfig) return g.__cfConfig;
  let cfg = defaults();
  try {
    if (existsSync(FILE)) {
      cfg = { ...defaults(), ...JSON.parse(readFileSync(FILE, "utf8")) };
    }
  } catch (e) {
    console.error("[config] falha ao ler:", e);
  }
  g.__cfConfig = cfg;
  return cfg;
}

export function saveConfig(patch: Partial<IntegrationConfig>): IntegrationConfig {
  const next = { ...getConfig(), ...patch };
  g.__cfConfig = next;
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(FILE, JSON.stringify(next, null, 2));
  } catch (e) {
    console.error("[config] falha ao salvar:", e);
  }
  return next;
}
