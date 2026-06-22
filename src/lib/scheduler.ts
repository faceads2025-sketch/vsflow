// Agendador de COBRANÇA: roda dentro do servidor Next e, todo dia, dispara o
// "fluxo de cobrança" para os contatos cuja data de pagamento chegou.
// Ex: cliente paga no dia 05 -> no dia 05 o robô dispara o áudio de cobrança.

import { db } from "./mock-data";
import { startFlow } from "./flow-engine";

const g = globalThis as unknown as { __cfScheduler?: ReturnType<typeof setInterval> };

// "hoje" e a hora no fuso de São Paulo (servidor roda em UTC no Railway)
function nowSP() {
  const sp = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const y = sp.getFullYear();
  const m = String(sp.getMonth() + 1).padStart(2, "0");
  const d = String(sp.getDate()).padStart(2, "0");
  return { date: `${y}-${m}-${d}`, hour: sp.getHours() };
}

async function runBillingCheck() {
  try {
    const { date: today, hour } = nowSP();
    // só cobra em horário comercial (evita disparar áudio de madrugada)
    if (hour < 9 || hour >= 20) return;

    for (const c of db.contacts) {
      if (!c.billingDate || c.billingFired) continue;
      if (c.billingDate > today) continue; // ainda não chegou o dia de pagar

      // fluxo escolhido no card; senão, qualquer fluxo publicado com "cobran" no nome
      const flow =
        (c.billingFlowId ? db.flows.find((f) => f.id === c.billingFlowId) : null) ||
        db.flows.find((f) => f.status === "published" && /cobran/i.test(f.name));
      if (!flow) continue;

      const conv = db.conversations.find((cv) => cv.contactId === c.id);
      if (!conv) continue;
      if (conv.botPaused) continue; // atendente assumiu -> não cobra automático

      c.billingFired = true; // trava antes de disparar (evita repetir se demorar)
      console.log(`[cobranca] disparando "${flow.name}" -> ${c.phone} (agendado p/ ${c.billingDate})`);
      startFlow(flow, conv, c).catch((e) => console.error("[cobranca] erro ao disparar:", e));
    }
  } catch (e) {
    console.error("[scheduler] erro:", e);
  }
}

// inicia o agendador uma única vez por processo (checa a cada 10 min)
export function startScheduler() {
  if (g.__cfScheduler) return;
  g.__cfScheduler = setInterval(runBillingCheck, 10 * 60 * 1000);
  runBillingCheck();
  console.log("[scheduler] agendador de cobrança iniciado");
}
