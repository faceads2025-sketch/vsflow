// Fila de envio com práticas anti-ban para conexão via WhatsApp Web (não-oficial).
// Objetivo: parecer humano e respeitar limites — reduz (não elimina) risco do número cair.
//
// Técnicas aplicadas:
//  - 1 mensagem por vez (sem rajadas)
//  - atraso aleatório entre mensagens (jitter humano)
//  - simulação de "digitando" antes de enviar (feita pelo sender)
//  - limite por hora e por dia
//  - sessão persistida em disco (não re-loga toda hora)

const MIN_DELAY = Number(process.env.WA_MIN_DELAY_MS || 4000);
const MAX_DELAY = Number(process.env.WA_MAX_DELAY_MS || 12000);
const HOURLY_LIMIT = Number(process.env.WA_HOURLY_LIMIT || 60);
const DAILY_LIMIT = Number(process.env.WA_DAILY_LIMIT || 500);

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Job {
  run: () => Promise<void>;
  resolve: (v?: any) => void;
  reject: (e: any) => void;
}

export class SendQueue {
  private queue: Job[] = [];
  private running = false;
  private hourWindow = { start: Date.now(), count: 0 };
  private dayWindow = { start: Date.now(), count: 0 };

  enqueue(run: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ run, resolve, reject });
      this.process();
    });
  }

  get pending() {
    return this.queue.length;
  }

  stats() {
    return {
      pending: this.queue.length,
      sentThisHour: this.hourWindow.count,
      sentToday: this.dayWindow.count,
      hourlyLimit: HOURLY_LIMIT,
      dailyLimit: DAILY_LIMIT,
    };
  }

  private rollWindows() {
    const now = Date.now();
    if (now - this.hourWindow.start > 3600_000) this.hourWindow = { start: now, count: 0 };
    if (now - this.dayWindow.start > 86_400_000) this.dayWindow = { start: now, count: 0 };
  }

  private async process() {
    if (this.running) return;
    this.running = true;

    while (this.queue.length) {
      this.rollWindows();

      // respeita limites: se estourou, espera até a janela virar
      if (this.dayWindow.count >= DAILY_LIMIT) {
        const wait = 86_400_000 - (Date.now() - this.dayWindow.start);
        console.warn(`[anti-ban] limite diário atingido, pausando ${Math.round(wait / 60000)}min`);
        await sleep(Math.min(wait, 60_000));
        continue;
      }
      if (this.hourWindow.count >= HOURLY_LIMIT) {
        const wait = 3600_000 - (Date.now() - this.hourWindow.start);
        console.warn(`[anti-ban] limite por hora atingido, pausando ${Math.round(wait / 1000)}s`);
        await sleep(Math.min(wait, 30_000));
        continue;
      }

      const job = this.queue.shift()!;
      try {
        await job.run();
        this.hourWindow.count++;
        this.dayWindow.count++;
        job.resolve();
      } catch (e) {
        job.reject(e);
      }

      // atraso humanizado antes da próxima
      if (this.queue.length) await sleep(rand(MIN_DELAY, MAX_DELAY));
    }

    this.running = false;
  }
}

// tempo de "digitando" proporcional ao tamanho do texto (mín 800ms, máx 4s)
export function typingDelay(text: string) {
  return Math.min(4000, Math.max(800, text.length * 60));
}

export { rand, sleep };
