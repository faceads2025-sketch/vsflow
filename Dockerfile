# ConversaFlow — imagem única rodando app Next + gateway WhatsApp Web (Baileys)
FROM node:20-bookworm-slim

# ffmpeg: conversão de áudio para nota de voz (ogg/opus)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# instala dependências (inclui devDeps: tsx/next/tailwind são necessários p/ build e gateway)
COPY package*.json ./
RUN npm ci

# código + build do Next
COPY . .
RUN npx prisma generate || true
RUN npm run build

ENV NODE_ENV=production
ENV WHATSAPP_MODE=web
# dados persistentes (volume Railway montado em /data): sessão + config de integração
ENV WA_AUTH_DIR=/data/wa-auth
ENV DATA_DIR=/data
ENV UPLOADS_DIR=/app/public/uploads

EXPOSE 3000

CMD ["node", "scripts/start.mjs"]
