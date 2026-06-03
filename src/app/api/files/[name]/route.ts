import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
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
  mov: "video/quicktime",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
};

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const name = path.basename(params.name); // evita path traversal
  const filePath = path.join(UPLOADS_DIR, name);
  const ext = (name.split(".").pop() || "").toLowerCase();
  const contentType = CT[ext] || "application/octet-stream";

  try {
    const info = await stat(filePath);
    const total = info.size;
    const range = req.headers.get("range");

    // requisição com Range (vídeo/áudio): responde 206 com o trecho pedido
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? parseInt(m[1], 10) : 0;
      const end = m && m[2] ? parseInt(m[2], 10) : total - 1;
      const buf = await readFile(filePath);
      const chunk = buf.subarray(start, end + 1);
      return new NextResponse(chunk, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunk.length),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Content-Length": String(total),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
