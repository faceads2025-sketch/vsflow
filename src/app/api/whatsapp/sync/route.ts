import { NextRequest, NextResponse } from "next/server";
import { upsertConversation } from "@/lib/mock-data";

// Recebe do gateway WhatsApp Web a lista de conversas do histórico (sync inicial).
// Body: { chats: [{ phone, name, avatar, preview, timestamp, unread }] }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const chats: any[] = Array.isArray(body.chats) ? body.chats : [];

  let synced = 0;
  for (const chat of chats) {
    if (!chat.phone) continue;
    upsertConversation({
      phone: chat.phone,
      name: chat.name,
      avatar: chat.avatar,
      preview: chat.preview || "",
      timestamp: chat.timestamp,
      unreadInc: chat.unread || 0,
    });
    synced++;
  }

  return NextResponse.json({ ok: true, synced });
}

export const dynamic = "force-dynamic";
