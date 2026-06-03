import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile, rm } from "fs/promises";
import { spawn } from "child_process";
import { tmpdir } from "os";
import path from "path";

export const runtime = "nodejs";

// converte áudio (webm/ogg/...) para MP3 — toca em todos os navegadores (Safari incluso)
// e o Z-API aceita mp3 e entrega como nota de voz.
async function toMp3(buf: Buffer): Promise<Buffer | null> {
  try {
    const base = path.join(tmpdir(), `up-${Date.now()}`);
    const inPath = base + ".in";
    const outPath = base + ".mp3";
    await writeFile(inPath, buf);
    await new Promise<void>((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-y", "-i", inPath,
        "-c:a", "libmp3lame", "-ac", "1", "-ar", "44100", "-b:a", "64k",
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
    console.error("[upload] conversão de áudio falhou:", e);
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

  // áudio gravado no navegador (webm/ogg) -> normaliza p/ mp3 (toca em qualquer navegador + Z-API)
  if ((file.type || "").startsWith("audio/")) {
    const mp3 = await toMp3(bytes);
    if (mp3) {
      bytes = mp3;
      safe = safe.replace(/\.[^.]+$/, "") + ".mp3";
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
