import { NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

// Retorna as colunas e os leads (contatos) com dados da conversa, para o Kanban.
export async function GET() {
  const columns = [...db.pipelineColumns].sort((a, b) => a.order - b.order);
  const firstCol = columns[0]?.id;

  const leads = db.contacts.map((c) => {
    const conv = db.conversations.find((cv) => cv.contactId === c.id);
    return {
      contactId: c.id,
      name: c.name,
      phone: c.phone,
      avatar: c.avatar,
      lastMessage: conv?.preview || "",
      lastMessageAt: conv?.lastMessageAt || c.subscribedAt,
      tags: c.tags
        .map((id) => db.tags.find((t) => t.id === id))
        .filter(Boolean)
        .map((t) => ({ name: t!.name, color: t!.color })),
      assignedTo: conv?.assignedTo || null,
      createdAt: c.subscribedAt,
      conversationId: conv?.id || null,
      columnId: c.pipelineColumnId && columns.some((col) => col.id === c.pipelineColumnId) ? c.pipelineColumnId : firstCol,
      order: c.pipelineOrder ?? 0,
      campaignId: c.campaignId || null,
    };
  });

  return NextResponse.json({ columns, leads });
}
