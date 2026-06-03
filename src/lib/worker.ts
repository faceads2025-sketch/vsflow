// Worker BullMQ — consome as filas de transmissão e automação.
// Rodar separadamente: `npx tsx src/lib/worker.ts` (requer Redis e DATA_SOURCE=db).

import { Worker } from "bullmq";
import IORedis from "ioredis";
import { sendText, sendTemplate } from "./whatsapp";

const connection: any = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

new Worker(
  "broadcast",
  async (job) => {
    const { to, content, templateId } = job.data;
    if (templateId) {
      await sendTemplate({ to, template: content });
    } else {
      await sendText({ to, body: content });
    }
  },
  { connection, limiter: { max: 20, duration: 1000 } }, // respeita rate-limit da API oficial
);

new Worker(
  "automation",
  async (job) => {
    const { content, contactId } = job.data;
    if (content) await sendText({ to: contactId, body: content });
  },
  { connection },
);

console.log("👷 Workers de broadcast e automação rodando...");
