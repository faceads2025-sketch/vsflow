import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ConversaFlow...");

  const company = await prisma.company.create({
    data: { name: "Companhia 207554", plan: "starter" },
  });

  await prisma.user.create({
    data: {
      email: "kennedy@conversaflow.com",
      passwordHash: await bcrypt.hash("123456", 10),
      name: "Kennedy",
      role: "owner",
      companyId: company.id,
    },
  });

  await prisma.whatsappAccount.create({
    data: {
      phoneNumber: "+55 47 8822-7384",
      displayName: "Companhia 207554",
      status: "connected",
      automationEnabled: true,
      companyId: company.id,
    },
  });

  const tags = await Promise.all(
    [
      { name: "Lead Quente", color: "#7DE3A6" },
      { name: "Cliente", color: "#3FC8E4" },
      { name: "Aguardando Pix", color: "#FBBF77" },
    ].map((t) => prisma.tag.create({ data: { ...t, companyId: company.id } })),
  );

  // Fluxo de boas-vindas
  const flow = await prisma.flow.create({
    data: {
      name: "FUNIL BOMBA PENIANA",
      description: "Boas-vindas + vídeo + oferta",
      isDefault: true,
      status: "published",
      companyId: company.id,
    },
  });

  await prisma.flowNode.createMany({
    data: [
      { id: "n1", type: "message", posX: 80, posY: 40, data: { text: "Olá! 👋 Bem-vindo!" }, flowId: flow.id },
      { id: "n2", type: "video", posX: 80, posY: 220, data: { url: "https://exemplo.com/video.mp4" }, flowId: flow.id },
      { id: "n3", type: "buttons", posX: 80, posY: 400, data: { text: "Quer ver a oferta?", buttons: [{ id: "b1", label: "Quero!" }] }, flowId: flow.id },
      { id: "n4", type: "message", posX: 420, posY: 400, data: { text: "🔥 50% OFF só hoje!" }, flowId: flow.id },
      { id: "n5", type: "transfer", posX: 420, posY: 580, data: { note: "Lead quente" }, flowId: flow.id },
    ],
  });
  await prisma.flowEdge.createMany({
    data: [
      { source: "n1", target: "n2", flowId: flow.id },
      { source: "n2", target: "n3", flowId: flow.id },
      { source: "n3", target: "n4", sourceHandle: "b1", flowId: flow.id },
      { source: "n4", target: "n5", flowId: flow.id },
    ],
  });

  const campaign = await prisma.campaign.create({
    data: {
      name: "BOMBA",
      slug: "funil-bomba-peniana",
      active: true,
      flowId: flow.id,
      companyId: company.id,
    },
  });

  await prisma.contact.create({
    data: {
      name: "Kennedy Lima",
      phone: "+5527998205955",
      campaignId: campaign.id,
      companyId: company.id,
      tags: { create: [{ tagId: tags[1].id }] },
    },
  });

  await prisma.keyword.createMany({
    data: [
      { word: "quero", matchType: "contains", flowId: flow.id, companyId: company.id },
      { word: "pix", matchType: "contains", flowId: flow.id, companyId: company.id },
      { word: "depositar", matchType: "contains", flowId: flow.id, companyId: company.id },
    ],
  });

  await prisma.template.createMany({
    data: [
      { name: "boas_vindas", category: "MARKETING", status: "APPROVED", body: "Olá {{1}}! Seja bem-vindo.", companyId: company.id },
      { name: "promo_fds", category: "MARKETING", status: "APPROVED", body: "🔥 {{1}}, 50% OFF!", companyId: company.id },
    ],
  });

  console.log("✅ Seed concluído. Login: kennedy@conversaflow.com / 123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
