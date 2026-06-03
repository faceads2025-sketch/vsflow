import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile, rm } from "fs/promises";
import { spawn } from "child_process";
import { tmpdir } from "os";
import path from "path";

export const runtime = "nodejs";

// converte áudio (webm/mp3/...) para ogg/opus (nota de voz nativa do WhatsApp)
async function toOgg(buf: Buffer): Promise<Buffer | null> {
  try {
    const base = path.join(tmpdir(), `up-${Date.now()}`);
    const inPath = base + ".in";
    const outPath = base + ".ogg";
    await writeFile(inPath, buf);
    await new Promise<void>((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-y", "-i", inPath,
        "-c:a", "libopus", "-ac", "1", "-ar", "16000", "-b:a", "24k",
        "-application", "voip", "-vbr", "on",
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

  // áudio gravado no navegador (webm/ogg) -> normaliza p/ ogg/opus (toca como nota de voz)
  if ((file.type || "").startsWith("audio/")) {
    const ogg = await toOgg(bytes);
    if (ogg) {
      bytes = ogg;
      safe = safe.replace(/\.[^.]+$/, "") + ".ogg";
    }
  }

  const filename = `${Date.now()}-${safe}`;
  await writeFile(path.join(dir, filename), bytes);

  const url = `/api/files/${filename}`;
  return NextResponse.json({ url, name: file.name, type: file.type, size: bytes.length });
}

export const dynamic = "force-dynamic";
