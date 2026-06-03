import { NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

export async function GET() {
  const totalConversations = db.conversations.length;
  const botReplied = db.conversations.filter((c) =>
    c.messages.some((m) => m.fromBot),
  ).length;
  const closed = db.conversations.filter((c) => c.status === "closed").length;
  const firstResponses = db.conversations.filter((c) =>
    c.messages.some((m) => m.direction === "outbound"),
  ).length;

  return NextResponse.json({
    welcome: "Kennedy",
    company: db.account.companyName,
    totalConversations,
    botReplied,
    botRepliedPct: totalConversations ? Math.round((botReplied / totalConversations) * 100) : 0,
    assignments: db.conversations.filter((c) => c.assignedTo).length,
    firstResponses,
    closed,
    medianFirstResponse: "2m 30s",
    medianClose: "18m",
  });
}
