// Configuração de integração do WhatsApp (multi-número), editável pela interface e
// persistida em disco. No Railway, aponte DATA_DIR para o volume (ex: /data).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "integration.json");

export type WhatsAppMode = "mock" | "zapi" | "web" | "cloud";

export interface Connection {
  id: string;
  label: string;
  instanceId: string;
  token: string;
}

export interface IntegrationConfig {
  mode: WhatsAppMode;
  zapiClientToken: string; // token de segurança da CONTA (compartilhado entre instâncias)
  connections: Connection[];
}

const g = globalThis as unknown as { __cfConfig?: IntegrationConfig };

function defaults(): IntegrationConfig {
  const envInstance = process.env.ZAPI_INSTANCE_ID || "";
  const envToken = process.env.ZAPI_TOKEN || "";
  return {
    mode: ((process.env.WHATSAPP_MODE as WhatsAppMode) || "mock"),
    zapiClientToken: process.env.ZAPI_CLIENT_TOKEN || "",
    connections: envInstance && envToken ? [{ id: "conn1", label: "Número 1", instanceId: envInstance, token: envToken }] : [],
  };
}

// migra config antiga (campos únicos zapiInstanceId/zapiToken) -> connections[]
function migrate(raw: any): IntegrationConfig {
  const base = defaults();
  const cfg: IntegrationConfig = {
    mode: raw.mode || base.mode,
    zapiClientToken: raw.zapiClientToken ?? base.zapiClientToken,
    connections: Array.isArray(raw.connections) ? raw.connections : [],
  };
  if (cfg.connections.length === 0 && (raw.zapiInstanceId || raw.zapiToken)) {
    cfg.connections = [{ id: "conn1", label: "Número 1", instanceId: raw.zapiInstanceId || "", token: raw.zapiToken || "" }];
  }
  if (cfg.connections.length === 0) cfg.connections = base.connections;
  return cfg;
}

export function getConfig(): IntegrationConfig {
  if (g.__cfConfig) return g.__cfConfig;
  let cfg = defaults();
  try {
    if (existsSync(FILE)) cfg = migrate(JSON.parse(readFileSync(FILE, "utf8")));
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

// retorna a conexão pelo id (ou a primeira como fallback)
export function getConnection(id?: string): Connection | undefined {
  const c = getConfig();
  return c.connections.find((x) => x.id === id) || c.connections[0];
}
