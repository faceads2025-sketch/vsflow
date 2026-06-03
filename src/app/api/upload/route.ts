import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

// Faz upload de arquivos (áudio, vídeo, imagem, documento) e devolve a URL pública.
// MVP: grava em /public/uploads. Em produção, troque por S3/Cloud Storage.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const maxMB = 16; // limite alinhado à WhatsApp Cloud API
  if (file.size > maxMB * 1024 * 1024) {
    return NextResponse.json({ error: `Arquivo maior que ${maxMB}MB` }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${safe}`;
  await writeFile(path.join(dir, filename), bytes);

  // servido pela rota dinâmica /api/files (funciona em produção e é público p/ o Z-API)
  const url = `/api/files/${filename}`;
  return NextResponse.json({ url, name: file.name, type: file.type, size: file.size });
}

export const dynamic = "force-dynamic";
