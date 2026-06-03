import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Em produção o Next não serve arquivos gravados em /public em runtime.
// Esta rota serve os uploads dinamicamente (e fica acessível publicamente p/ o Z-API baixar).
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

const CT: Record<string, string> = {
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  webm: "video/webm",
  mp4: "video/mp4",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
};

export async function GET(_req: NextRequest, { params }: { params: { name: string } }) {
  const name = path.basename(params.name); // evita path traversal
  try {
    const buf = await readFile(path.join(UPLOADS_DIR, name));
    const ext = (name.split(".").pop() || "").toLowerCase();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": CT[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
