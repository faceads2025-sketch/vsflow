// Gateway WhatsApp Web (não-oficial, via Baileys).
// Roda como processo separado:  npm run wa
//
// Expõe HTTP simples para o app Next:
//   GET  /status   -> { status, qr?, phone?, queue }
//   POST /send      -> { to, type, text|url, caption }
//   POST /logout
//   POST /connect   (reinicia a sessão)
//
// Mensagens recebidas são repassadas ao webhook do app (reusa a automação por palavra-chave).

import { createServer } from "http";
import { rm, readFile, writeFile, mkdir } from "fs/promises";
import { spawn } from "child_process";
import { tmpdir } from "os";
import path from "path";
import qrcode from "qrcode";
import pino from "pino";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  Browsers,
  type WASocket,
} from "@whiskeysockets/baileys";
import { SendQueue, typingDelay, sleep, rand } from "./anti-ban";

const PORT = Number(process.env.WA_GATEWAY_PORT || 4001);
const WEBHOOK_URL = process.env.APP_WEBHOOK_URL || "http://localhost:3000/api/webhook/whatsapp";
const SYNC_URL = process.env.APP_SYNC_URL || WEBHOOK_URL.replace("/webhook/whatsapp", "/whatsapp/sync");
// configuráveis por env (no Railway, aponte WA_AUTH_DIR para um volume persistente)
const AUTH_DIR = process.env.WA_AUTH_DIR || path.join(process.cwd(), ".wa-auth");
const CHATS_FILE = path.join(AUTH_DIR, "known-chats.json");
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

function extOf(mime: string, kind: string) {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("mp4") && kind === "audio") return "m4a";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("mp4") || mime.includes("video")) return "mp4";
  if (mime.includes("pdf")) return "pdf";
  return kind === "audio" ? "ogg" : kind === "image" ? "jpg" : kind === "video" ? "mp4" : "bin";
}

// envia lista de conversas para o app sincronizar
async function postSync(chats: any[]) {
  if (!chats.length) {
    console.log("[wa] postSync: nada para sincronizar (0 conversas individuais)");
    return;
  }
  try {
    const res = await fetch(SYNC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chats }),
    });
    const j = await res.json();
    console.log(`[wa] sincronizadas ${j.synced ?? chats.length} conversas`);
  } catch (e) {
    console.error("[wa] falha ao sincronizar:", e);
  }
}

// cache simples de fotos de perfil para não pedir a mesma várias vezes
// mapeia @lid -> telefone real (@s.whatsapp.net), pois a foto só é liberada pelo telefone
const lidToPn = new Map<string, string>();

// cache de mensagens enviadas/recebidas p/ responder pedidos de reenvio (resolve
// o aviso "Aguardando esta mensagem" do destinatário). Usado pelo getMessage do Baileys.
const msgStore = new Map<string, any>();
function cacheMsg(id?: string | null, message?: any) {
  if (!id || !message) return;
  msgStore.set(id, message);
  if (msgStore.size > 2000) {
    const oldest = msgStore.keys().next().value;
    if (oldest) msgStore.delete(oldest); // limita memória
  }
}

const avatarCache = new Map<string, string>();
async function getAvatar(jid: string): Promise<string | undefined> {
  // foto pelo @lid dá "not-authorized": usa o telefone real quando conhecido
  const target = jid.endsWith("@lid") && lidToPn.has(jid) ? lidToPn.get(jid)! : jid;
  if (avatarCache.has(target)) return avatarCache.get(target);
  try {
    const url = await sock?.profilePictureUrl(target, "image");
    if (url) {
      avatarCache.set(target, url); // só cacheia sucesso
      console.log(`[wa] foto OK para ${target}`);
      return url;
    }
    return undefined;
  } catch (e: any) {
    console.log(`[wa] falha foto ${target}: ${e?.message || e}`);
    return undefined;
  }
}

// registro local de TODAS as conversas vistas (histórico + tempo real).
// Permite ressincronizar sob demanda sem depender de re-escanear o QR.
const knownChats = new Map<string, { name?: string; preview?: string; ts?: number; unread?: number }>();

let saveTimer: NodeJS.Timeout | null = null;
async function saveKnownChats() {
  try {
    await mkdir(AUTH_DIR, { recursive: true });
    await writeFile(CHATS_FILE, JSON.stringify(Array.from(knownChats.entries())));
  } catch (e) {
    console.error("[wa] falha ao salvar conversas:", e);
  }
}
async function loadKnownChats() {
  try {
    const raw = await readFile(CHATS_FILE, "utf8");
    for (const [jid, d] of JSON.parse(raw)) knownChats.set(jid, d);
    console.log(`[wa] ${knownChats.size} conversas carregadas do disco`);
  } catch {
    /* arquivo ainda não existe */
  }
}

function remember(jid: string, data: { name?: string; preview?: string; ts?: number; unread?: number }) {
  if (!jid || !isIndividual(jid)) return; // só conversas individuais (inclui @lid)
  const cur = knownChats.get(jid) || {};
  knownChats.set(jid, {
    name: data.name || cur.name,
    preview: data.preview || cur.preview,
    ts: data.ts && data.ts >= (cur.ts || 0) ? data.ts : cur.ts,
    unread: data.unread ?? cur.unread,
  });
  // salva em disco (debounce 1.5s) p/ sobreviver a reinícios
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveKnownChats, 1500);
}

// envia tudo que o gateway conhece para o app sincronizar
async function flushKnownChats(): Promise<number> {
  const entries = Array.from(knownChats.entries()).slice(0, 100);
  const payload: any[] = [];
  for (const [jid, d] of entries) {
    payload.push({
      phone: jid.split("@")[0],
      name: d.name || jid.split("@")[0],
      avatar: await getAvatar(jid),
      preview: d.preview || "",
      unread: d.unread || 0,
      timestamp: d.ts ? new Date(d.ts * 1000).toISOString() : undefined,
    });
    await sleep(rand(100, 250)); // suaviza pedidos de foto (anti-ban)
  }
  await postSync(payload);
  return payload.length;
}

const logger = pino({ level: "warn" });
const queue = new SendQueue();

let sock: WASocket | null = null;
let status: "disconnected" | "connecting" | "qr" | "connected" = "disconnected";
let currentQR: string | null = null;
let phone: string | null = null;
let starting = false;

// baixa um arquivo (URL local/remota) para Buffer -> enviado ao WhatsApp via upload do Baileys
async function urlToBuffer(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch (e) {
    console.error("[wa] urlToBuffer falhou:", e);
    return null;
  }
}

// roda ffmpeg e devolve o stdout como Buffer
function ffmpegToBuffer(args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", args);
    const chunks: Buffer[] = [];
    ff.stdout.on("data", (d) => chunks.push(d));
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error("ffmpeg code " + code))));
  });
}

// calcula o waveform (64 amostras 0-100) que o WhatsApp usa pra desenhar o gráfico da nota de voz
function computeWaveform(pcm: Buffer): Uint8Array {
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const buckets = 64;
  const block = Math.max(1, Math.floor(samples.length / buckets));
  const peaks: number[] = [];
  let max = 1;
  for (let i = 0; i < buckets; i++) {
    let peak = 0;
    for (let j = 0; j < block; j++) {
      const v = Math.abs(samples[i * block + j] || 0);
      if (v > peak) peak = v;
    }
    peaks.push(peak);
    if (peak > max) max = peak;
  }
  const wf = new Uint8Array(buckets);
  for (let i = 0; i < buckets; i++) wf[i] = Math.min(100, Math.round((peaks[i] / max) * 100));
  return wf;
}

// converte áudio -> nota de voz do WhatsApp (ogg/opus + waveform + duração)
async function toVoiceNote(url: string): Promise<{ ogg: Buffer; waveform: Uint8Array; seconds: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const base = path.join(tmpdir(), `wa-${Date.now()}`);
    const inPath = base + ".in";
    const outPath = base + ".ogg";
    await writeFile(inPath, buf);

    // 1) converte para ogg/opus (formato nativo de voz: mono 16kHz, voip)
    await new Promise<void>((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-y", "-i", inPath,
        "-c:a", "libopus", "-ac", "1", "-ar", "16000", "-b:a", "24k",
        "-application", "voip", "-vbr", "on", "-compression_level", "10",
        outPath,
      ]);
      ff.on("error", reject);
      ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg code " + code))));
    });
    const ogg = await readFile(outPath);

    // 2) decodifica para PCM (mono 8kHz) e calcula waveform + duração
    const pcm = await ffmpegToBuffer(["-i", inPath, "-f", "s16le", "-ac", "1", "-ar", "8000", "pipe:1"]);
    const seconds = Math.max(1, Math.round(pcm.length / 2 / 8000));
    const waveform = computeWaveform(pcm);

    rm(inPath, { force: true });
    rm(outPath, { force: true });
    return { ogg, waveform, seconds };
  } catch (e) {
    console.error("[wa] geração da nota de voz falhou:", e);
    return null;
  }
}

function jidOf(number: string) {
  // se já for um jid completo, usa direto
  if (number.includes("@")) return number;
  const digits = number.replace(/\D/g, "");
  // se conhecemos esse contato (inclusive como @lid), responde no jid exato
  for (const jid of knownChats.keys()) {
    if (jid.split("@")[0].replace(/\D/g, "") === digits) return jid;
  }
  return `${digits}@s.whatsapp.net`;
}

const isIndividual = (jid: string) =>
  jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid") || jid.endsWith("@c.us");

async function startSock() {
  if (starting) return;
  starting = true;
  status = "connecting";

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    // identifica como desktop -> WhatsApp envia o histórico de conversas corretamente
    browser: Browsers.macOS("Desktop"),
    // online ao conectar ajuda a estabelecer sessão/entrega (reduz "Aguardando esta mensagem")
    markOnlineOnConnect: true,
    // IMPORTANTE: false -> evita inundar a conexão e travar a init query (fetchProps),
    // que é o que estabelece a media-conn. Com true, a mídia chegava "indisponível".
    syncFullHistory: false,
    // responde pedidos de reenvio do destinatário -> evita "Aguardando esta mensagem"
    getMessage: async (key) => (key.id ? msgStore.get(key.id) : undefined),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = await qrcode.toDataURL(qr);
      status = "qr";
      console.log("[wa] QR atualizado — escaneie no app");
    }

    if (connection === "open") {
      status = "connected";
      currentQR = null;
      phone = sock?.user?.id?.split(":")[0] ?? null;
      console.log(`[wa] conectado: +${phone}`);
      // flush automático: depois de conectar, dá um tempo pro histórico chegar e sincroniza
      setTimeout(() => flushKnownChats().then((n) => console.log(`[wa] auto-sync: ${n} conversas`)), 12000);
    }

    if (connection === "close") {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      status = "disconnected";
      starting = false;
      console.warn(`[wa] conexão fechada (code ${code}). ${loggedOut ? "Deslogado." : "Reconectando..."}`);
      // reconexão automática para o número não "cair" (exceto se deslogou de fato)
      if (!loggedOut) {
        await sleep(rand(2000, 5000));
        startSock();
      } else {
        sock = null;
        phone = null;
      }
    }
  });

  // mensagens (recebidas e enviadas) -> registra conversa; inbound vai pro webhook
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const m of messages) {
      if (!m.message) continue;
      cacheMsg(m.key.id, m.message); // cache p/ reenvios
      const rawJid = m.key.remoteJid || "";
      if (rawJid.endsWith("@g.us") || rawJid.endsWith("@broadcast")) continue; // ignora grupos/status

      // identidade: prefere o telefone real (senderPn) ao @lid — libera foto e telefone correto
      const pn = (m.key as any).senderPn as string | undefined;
      if (rawJid.endsWith("@lid") && pn) lidToPn.set(rawJid, pn);
      const jid = pn || rawJid;
      const from = jid.split("@")[0];
      if (!from) continue;

      // detecta tipo da mensagem (texto ou mídia)
      const inner: any = m.message.ephemeralMessage?.message || m.message.viewOnceMessage?.message || m.message;
      let mtype = "text";
      let mediaNode: any = null;
      let mimetype = "";
      if (inner.audioMessage) { mtype = "audio"; mediaNode = inner.audioMessage; mimetype = mediaNode.mimetype || "audio/ogg"; }
      else if (inner.imageMessage) { mtype = "image"; mediaNode = inner.imageMessage; mimetype = mediaNode.mimetype || "image/jpeg"; }
      else if (inner.videoMessage) { mtype = "video"; mediaNode = inner.videoMessage; mimetype = mediaNode.mimetype || "video/mp4"; }
      else if (inner.documentMessage) { mtype = "file"; mediaNode = inner.documentMessage; mimetype = mediaNode.mimetype || "application/octet-stream"; }
      else if (inner.stickerMessage) { mtype = "image"; mediaNode = inner.stickerMessage; mimetype = "image/webp"; }

      const caption = inner.conversation || inner.extendedTextMessage?.text || mediaNode?.caption || "";

      // registra a conversa (mesmo as enviadas por você, p/ aparecerem na lista)
      remember(jid, { name: m.pushName || undefined, preview: caption || `[${mtype}]`, ts: Number(m.messageTimestamp || 0) });

      if (m.key.fromMe) continue; // não reprocessa automação para mensagens suas

      // baixa a mídia recebida e salva em /public/uploads
      let mediaUrl: string | undefined;
      if (mediaNode) {
        try {
          const buf = (await downloadMediaMessage(
            { key: m.key, message: inner } as any,
            "buffer",
            {},
            { logger, reuploadRequest: sock!.updateMediaMessage },
          )) as Buffer;
          await mkdir(UPLOADS_DIR, { recursive: true });
          const filename = `wa-${Date.now()}.${extOf(mimetype, mtype)}`;
          await writeFile(path.join(UPLOADS_DIR, filename), buf);
          mediaUrl = `/api/files/${filename}`;
          console.log(`[wa] mídia recebida (${mtype}) salva: ${mediaUrl}`);
        } catch (e) {
          console.error("[wa] falha ao baixar mídia recebida:", e);
        }
      }

      const avatar = await getAvatar(jid);
      try {
        await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, text: caption, type: mtype, mediaUrl, name: m.pushName, avatar, source: "whatsapp-web" }),
        });
      } catch (e) {
        console.error("[wa] falha ao repassar webhook:", e);
      }
    }
  });

  // histórico inicial -> sincroniza as conversas existentes do número conectado
  sock.ev.on("messaging-history.set", async ({ chats, contacts, messages }) => {
    console.log(`[wa] history recebido: ${chats?.length || 0} chats, ${contacts?.length || 0} contatos, ${messages?.length || 0} mensagens`);
    console.log(`[wa] chat ids: ${(chats || []).map((c) => c.id).join(", ")}`);
    console.log(`[wa] msg jids: ${(messages || []).map((m) => m.key?.remoteJid).join(", ")}`);

    const nameByJid = new Map<string, string>();
    for (const c of contacts || []) {
      if (c.id) nameByJid.set(c.id, c.name || c.notify || c.verifiedName || "");
    }

    // registra chats do histórico
    for (const c of chats || []) {
      if (!isIndividual(c.id || "")) continue;
      remember(c.id!, {
        name: nameByJid.get(c.id!) || c.name || undefined,
        unread: c.unreadCount || 0,
        ts: c.conversationTimestamp ? Number(c.conversationTimestamp) : undefined,
      });
    }
    // registra preview a partir das mensagens do histórico
    for (const m of messages || []) {
      const jid = m.key?.remoteJid || "";
      const body =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        "";
      remember(jid, { name: nameByJid.get(jid), preview: body, ts: Number(m.messageTimestamp || 0) });
    }

    const n = await flushKnownChats();
    console.log(`[wa] history-sync: ${n} conversas`);
  });

  // chats novos/atualizados (reconexão e tempo real)
  sock.ev.on("chats.upsert", async (newChats) => {
    for (const c of newChats || []) {
      if (!isIndividual(c.id || "")) continue;
      remember(c.id!, {
        name: c.name || undefined,
        unread: c.unreadCount || 0,
        ts: c.conversationTimestamp ? Number(c.conversationTimestamp) : undefined,
      });
    }
    await flushKnownChats();
  });

  starting = false;
}

// envio humanizado: assina presença, "digitando", pausa, então envia
async function sendMessage(to: string, payload: any, previewText = "") {
  if (!sock || status !== "connected") throw new Error("WhatsApp não conectado");
  const jid = jidOf(to);
  const isMedia = !!(payload.audio || payload.image || payload.video || payload.document);
  return queue.enqueue(async () => {
    // garante uma media-conn fresca antes de subir mídia (evita "mídia indisponível")
    if (isMedia) {
      try {
        const mc = await sock!.refreshMediaConn(true);
        console.log(`[wa] media-conn ok (host: ${mc?.hosts?.[0]?.hostname || "?"})`);
      } catch (e: any) {
        console.error("[wa] refreshMediaConn falhou:", e?.message || e);
      }
    }
    await sock!.presenceSubscribe(jid);
    await sleep(rand(400, 1200));
    await sock!.sendPresenceUpdate("composing", jid);
    await sleep(typingDelay(previewText));
    await sock!.sendPresenceUpdate("paused", jid);
    const sent = await sock!.sendMessage(jid, payload);
    cacheMsg(sent?.key?.id, sent?.message); // guarda p/ possíveis reenvios

    // diagnóstico decisivo: rebaixar a própria mídia enviada
    if (isMedia && sent) {
      try {
        const b = (await downloadMediaMessage(sent, "buffer", {}, { logger, reuploadRequest: sock!.updateMediaMessage })) as Buffer;
        console.log(`[wa] ✅ verificação: mídia re-baixada OK (${b.length} bytes) -> upload VÁLIDO (problema é no destinatário)`);
      } catch (e: any) {
        console.error(`[wa] ❌ verificação: não consegui rebaixar a mídia -> upload QUEBRADO: ${e?.message || e}`);
      }
    }
  });
}

// ---------------- HTTP server ----------------
function json(res: any, code: number, body: any) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: any): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return {};
  }
}

const server = createServer(async (req, res) => {
  const url = (req.url || "").split("?")[0];

  if (req.method === "GET" && url === "/status") {
    return json(res, 200, { status, qr: currentQR, phone, queue: queue.stats() });
  }

  if (req.method === "POST" && url === "/connect") {
    if (status === "disconnected") startSock();
    return json(res, 200, { ok: true, status });
  }

  if (req.method === "POST" && url === "/resync") {
    if (status !== "connected") return json(res, 400, { error: "WhatsApp não conectado" });
    const n = await flushKnownChats();
    return json(res, 200, { ok: true, synced: n, known: knownChats.size });
  }

  if (req.method === "POST" && url === "/logout") {
    try {
      await sock?.logout();
    } catch {}
    sock = null;
    status = "disconnected";
    phone = null;
    currentQR = null;
    avatarCache.clear();
    knownChats.clear();
    // limpa a sessão para que a próxima conexão peça um QR novo (e ressincronize o histórico)
    try {
      await rm(AUTH_DIR, { recursive: true, force: true });
    } catch {}
    return json(res, 200, { ok: true });
  }

  if (req.method === "POST" && url === "/send") {
    const body = await readBody(req);
    try {
      let payload: any;
      let preview = body.text || body.caption || "";
      console.log(`[wa] /send ${body.type || "text"} -> ${body.to}`);
      switch (body.type) {
        case "image": {
          const b = await urlToBuffer(body.url);
          if (!b) throw new Error("não consegui ler a imagem");
          payload = { image: b, caption: body.caption };
          break;
        }
        case "video": {
          const b = await urlToBuffer(body.url);
          if (!b) throw new Error("não consegui ler o vídeo");
          payload = { video: b, caption: body.caption };
          break;
        }
        case "audio": {
          // converte p/ ogg/opus e deixa o Baileys calcular duração + waveform.
          // IMPORTANTE: não passar `seconds` -> assim o Baileys cria o arquivo
          // temporário e consegue gerar o waveform (via audio-decode).
          const v = await toVoiceNote(body.url);
          if (v) {
            payload = { audio: v.ogg, mimetype: "audio/ogg; codecs=opus", ptt: true };
            console.log("[wa] nota de voz (ogg/opus) — Baileys vai gerar waveform+duração");
          } else {
            const b = await urlToBuffer(body.url);
            if (!b) throw new Error("não consegui ler o áudio");
            payload = { audio: b, mimetype: "audio/ogg; codecs=opus", ptt: true };
            console.log("[wa] áudio enviado sem conversão (fallback buffer)");
          }
          break;
        }
        case "document":
        case "file": {
          const b = await urlToBuffer(body.url);
          if (!b) throw new Error("não consegui ler o arquivo");
          payload = { document: b, fileName: body.fileName || "arquivo", mimetype: body.mimetype || "application/octet-stream" };
          break;
        }
        default:
          payload = { text: body.text };
      }
      await sendMessage(body.to, payload, preview);
      return json(res, 200, { ok: true });
    } catch (e: any) {
      console.error("[wa] erro no /send:", e?.message || e);
      return json(res, 500, { error: e.message });
    }
  }

  json(res, 404, { error: "not found" });
});

server.listen(PORT, async () => {
  console.log(`🟢 WhatsApp Web gateway na porta ${PORT}`);
  console.log(`   Sessão: ${AUTH_DIR}`);
  console.log(`   Webhook: ${WEBHOOK_URL}`);
  await loadKnownChats();
  startSock();
  // ressincroniza o que já conhecemos assim que o app estiver de pé
  setTimeout(() => {
    if (status === "connected" && knownChats.size) flushKnownChats().then((n) => console.log(`[wa] resync inicial: ${n} conversas`));
  }, 6000);
});
