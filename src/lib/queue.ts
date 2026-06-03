// Filas com BullMQ + Redis para disparos (broadcast) e automações (sequências/delays).
// Em modo mock as funções apenas simulam o enfileiramento.

import type { Queue } from "bullmq";

const isMock = (process.env.DATA_SOURCE || "mock") === "mock";

let broadcastQueue: Queue | null = null;
let automationQueue: Queue | null = null;

function getConnection() {
  return { url: process.env.REDIS_URL || "redis://localhost:6379" };
}

async function getQueues() {
  if (isMock) return null;
  if (!broadcastQueue || !automationQueue) {
    const { Queue } = await import("bullmq");
    const IORedis = (await import("ioredis")).default;
    const connection: any = new IORedis(getConnection().url, { maxRetriesPerRequest: null });
    broadcastQueue = new Queue("broadcast", { connection });
    automationQueue = new Queue("automation", { connection });
  }
  return { broadcastQueue, automationQueue };
}

export async function enqueueBroadcast(payload: { broadcastId: string; to: string; content: string; templateId?: string }) {
  if (isMock) {
    console.log(`[Queue mock] broadcast -> ${payload.to}`);
    return;
  }
  const q = await getQueues();
  await q!.broadcastQueue!.add("send", payload, { attempts: 3, backoff: { type: "exponential", delay: 1000 } });
}

export async function enqueueSequenceStep(payload: { contactId: string; sequenceId: string; stepId: string; content: string }, delayMs: number) {
  if (isMock) {
    console.log(`[Queue mock] sequence step in ${delayMs}ms -> ${payload.contactId}`);
    return;
  }
  const q = await getQueues();
  await q!.automationQueue!.add("step", payload, { delay: delayMs, attempts: 3 });
}
