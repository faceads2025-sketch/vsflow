// Launcher de produção: roda o app Next + o gateway WhatsApp Web no mesmo container.
// Usado pelo Dockerfile (CMD). Se um processo morrer, derruba o container (Railway reinicia).

import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const PORT = process.env.PORT || "3000";

// modo efetivo: config salva pela interface (volume) tem prioridade sobre a env
function effectiveMode() {
  try {
    const file = path.join(process.env.DATA_DIR || path.join(process.cwd(), ".data"), "integration.json");
    if (existsSync(file)) {
      const m = JSON.parse(readFileSync(file, "utf8"))?.mode;
      if (m) return String(m).toLowerCase();
    }
  } catch {}
  return (process.env.WHATSAPP_MODE || "web").toLowerCase();
}

// liga app <-> gateway por localhost (mesmo container)
process.env.WHATSAPP_MODE ||= "web";
process.env.WA_GATEWAY_URL ||= "http://localhost:4001";
process.env.APP_URL ||= `http://localhost:${PORT}`;
process.env.APP_WEBHOOK_URL ||= `http://localhost:${PORT}/api/webhook/whatsapp`;
process.env.APP_SYNC_URL ||= `http://localhost:${PORT}/api/whatsapp/sync`;

const procs = [];
let dead = false;

function shutdown(reason) {
  if (dead) return;
  dead = true;
  console.error(`[start] encerrando: ${reason}`);
  for (const p of procs) {
    try {
      p.kill("SIGTERM");
    } catch {}
  }
  setTimeout(() => process.exit(1), 1500);
}

function run(name, cmd, args) {
  const p = spawn(cmd, args, { stdio: "inherit", env: process.env });
  p.on("exit", (code) => shutdown(`${name} saiu (code ${code})`));
  p.on("error", (e) => shutdown(`${name} erro: ${e.message}`));
  procs.push(p);
}

const MODE = effectiveMode();
console.log(`[start] modo=${MODE} — subindo app na porta ${PORT}`);
run("web", "npx", ["next", "start", "-p", PORT]);

// Sobe o gateway Baileys SEMPRE (a menos que RUN_WA_GATEWAY=false), pra o modo
// "WhatsApp Web" poder conectar via QR dentro do próprio app, sem terminal.
if (process.env.RUN_WA_GATEWAY !== "false") {
  console.log("[start] subindo gateway WhatsApp Web (Baileys) na porta 4001");
  run("wa", "npx", ["tsx", "src/server/wa-gateway.ts"]);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
