import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile, rm } from "fs/promises";
import { spawn } from "child_process";
import { tmpdir } from "os";
import path from "path";

export const runtime = "nodejs";

// converte áudio para um formato alvo (mp3 p/ tocar no app, ogg/opus p/ enviar como voz)
async function convertAudio(buf: Buffer, target: "mp3" | "ogg"): Promise<Buffer | null> {
  try {
    const base = path.join(tmpdir(), `up-${Date.now()}-${target}`);
    const inPath = base + ".in";
    const outPath = base + "." + target;
    await writeFile(inPath, buf);
    const args =
      target === "mp3"
        ? ["-y", "-i", inPath, "-c:a", "libmp3lame", "-ac", "1", "-ar", "44100", "-b:a", "64k", outPath]
        : ["-y", "-i", inPath, "-c:a", "libopus", "-ac", "1", "-ar", "16000", "-b:a", "24k", "-application", "voip", "-vbr", "on", outPath];
    await new Promise<void>((resolve, reject) => {
      const ff = spawn("ffmpeg", args);
      ff.on("error", reject);
      ff.on("close", (c) => (c === 0 ? resolve() : reject(new Error("ffmpeg " + c))));
    });
    const out = await readFile(outPath);
    rm(inPath, { force: true });
    rm(outPath, { force: true });
    return out;
  } catch (e) {
    console.error(`[upload] conversão de áudio (${target}) falhou:`, e);
    return null;
  }
}

// converte vídeo (mov/hevc/webm/...) para MP4 H.264 + AAC (toca em qualquer navegador)
async function toMp4(buf: Buffer): Promise<Buffer | null> {
  try {
    const base = path.join(tmpdir(), `upv-${Date.now()}`);
    const inPath = base + ".in";
    const outPath = base + ".mp4";
    await writeFile(inPath, buf);
    await new Promise<void>((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-y", "-i", inPath,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
        "-vf", "scale='min(1280,iw)':-2",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        outPath,
      ]);
      ff.on("error", reject);
      ff.on("close", (c) => (c === 0 ? resolve() : reject(new Error("ffmpeg " + c))));
    });
    const out = await readFile(outPath);
    rm(inPath, { force: true });
    rm(outPath, { force: true });
    return out;
  } catch (e) {
    console.error("[upload] conversão de vídeo falhou:", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const maxMB = 16;
  if (file.size > maxMB * 1024 * 1024) {
    return NextResponse.json({ error: `Arquivo maior que ${maxMB}MB` }, { status: 413 });
  }

  let bytes: Buffer = Buffer.from(await file.arrayBuffer());
  const dir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });

  let safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  // áudio: salva MP3 (player do app) E uma versão OGG/OPUS irmã (envio como nota de voz)
  if ((file.type || "").startsWith("audio/")) {
    const mp3 = await convertAudio(bytes, "mp3");
    const ogg = await convertAudio(bytes, "ogg");
    if (mp3) {
      bytes = mp3;
      const baseName = `${Date.now()}-${safe.replace(/\.[^.]+$/, "")}`;
      safe = baseName + ".mp3";
      // grava o irmão .ogg (mesmo nome base) para o envio via Z-API/Cloud
      if (ogg) {
        try {
          await writeFile(path.join(dir, baseName + ".ogg"), ogg);
        } catch (e) {
          console.error("[upload] falha ao salvar ogg:", e);
        }
      }
      await writeFile(path.join(dir, safe), bytes);
      return NextResponse.json({ url: `/api/files/${safe}`, name: file.name, type: "audio/mpeg", size: bytes.length });
    }
  } else if ((file.type || "").startsWith("video/")) {
    // vídeo (mov/hevc/webm/...) -> mp4 H.264 (toca em qualquer navegador e no WhatsApp)
    const mp4 = await toMp4(bytes);
    if (mp4) {
      bytes = mp4;
      safe = safe.replace(/\.[^.]+$/, "") + ".mp4";
    }
  }

  const filename = `${Date.now()}-${safe}`;
  await writeFile(path.join(dir, filename), bytes);

  const url = `/api/files/${filename}`;
  return NextResponse.json({ url, name: file.name, type: file.type, size: bytes.length });
}

export const dynamic = "force-dynamic";
