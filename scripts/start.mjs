// Launcher de produção: roda o app Next + o gateway WhatsApp Web no mesmo container.
// Usado pelo Dockerfile (CMD). Se um processo morrer, derruba o container (Railway reinicia).

import { spawn } from "node:child_process";

const PORT = process.env.PORT || "3000";

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

console.log(`[start] subindo app (porta ${PORT}) + gateway WhatsApp Web (4001)`);
run("web", "npx", ["next", "start", "-p", PORT]);
run("wa", "npx", ["tsx", "src/server/wa-gateway.ts"]);

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
