# ConversaFlow

SaaS web de automação de atendimento no WhatsApp — inspirado no BotConversa.
Conecte um número, receba leads, crie campanhas, monte fluxos visuais e dispare
mensagens automáticas quando o lead entra no funil.

> **Stack:** Next.js 14 (App Router) · TailwindCSS · Prisma · PostgreSQL · Redis + BullMQ · WhatsApp Cloud API oficial · ReactFlow

---

## ✨ Funcionalidades

| Módulo | O que faz |
|---|---|
| **Painel de Controle** | Boas-vindas, total de conversas, respostas do bot, métricas de desempenho, tempos médios |
| **Contatos** | Lista, criação manual, importação CSV, filtros por etiqueta/campanha, exportar relatório |
| **Campanhas** | Criar campanha, gerar link de entrada + QR Code, fluxo iniciado automaticamente ao entrar |
| **Transmissão** | Criar/agendar/rascunho, histórico, templates aprovados, respeita limites da API oficial |
| **Inbox** | Atendimento humano, enviar texto/mídia, **pausar e reativar automação** quando o atendente assume |
| **Automação** | Palavras-chave (quero/pix/depositar → fluxo), sequências com delay, webhooks |
| **Fluxos de conversa** | **Construtor visual** (drag/connect) com 13 tipos de bloco |
| **Configurações** | Conexão WhatsApp, campos, etiquetas, respostas rápidas, equipe, horários, fluxos padrão, faturamento |
| **Modelos** | Criar templates, status de aprovação, usar em transmissões |

### Blocos do construtor de fluxos
Mensagem · Imagem · Vídeo · Áudio · Pergunta · Botões · Condição · Delay · Transferir p/ atendente · Aplicar etiqueta · Ir para bloco · Webhook · Finalizar.

---

## 🚀 Rodando localmente (modo MOCK — sem banco)

O projeto já vem com dados mockados em memória. É o jeito mais rápido de ver tudo funcionando:

```bash
cd conversaflow
npm install
cp .env.example .env        # DATA_SOURCE já vem como "mock"
npm run dev
```

Abra http://localhost:3000 → você cai no **Painel de Controle**.

### O que testar no modo mock
- **Campanhas → Copiar Link / Mostrar QR.** Abra o link `/c/<slug>` em outra aba,
  preencha nome + telefone e clique em *Quero participar*: o contato é salvo com a
  campanha de origem e **o fluxo vinculado é executado** (os passos aparecem na tela).
- **Fluxos de conversa → abrir um fluxo.** Arraste blocos da paleta, conecte-os,
  edite no painel da direita, clique em **Testar** para simular a execução e em **Publicar**.
- **Inbox.** Selecione uma conversa, envie mensagens e use **Assumir conversa**
  para pausar a automação (e **Reativar automação** para devolver ao bot).
- **Automação → Palavras Chave.** Crie a palavra `pix` ligada a um fluxo. Depois
  simule uma mensagem recebida (veja webhook abaixo).

### Simular mensagem recebida do WhatsApp (mock)
```bash
curl -X POST http://localhost:3000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"from":"+5527998205955","text":"quero o pix"}'
```
A automação por palavra-chave dispara e o envio aparece no console (`[WhatsApp mock] -> ...`).

---

## 🗄️ Rodando com PostgreSQL + Redis (modo real)

```bash
# 1) Suba Postgres e Redis (exemplo com docker)
docker run -d --name cf-pg  -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
docker run -d --name cf-redis -p 6379:6379 redis:7

# 2) Configure o .env
#    DATA_SOURCE="db"
#    DATABASE_URL e REDIS_URL apontando para os serviços acima

# 3) Migre o banco e popule
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed        # cria empresa, fluxo, campanha, contatos (login: kennedy@conversaflow.com / 123456)

# 4) App + worker das filas (em terminais separados)
npm run dev
npx tsx src/lib/worker.ts
```

> As rotas de API atuais usam o store em memória para o MVP. A camada Prisma
> (`src/lib/prisma.ts`), o schema completo e o seed já estão prontos — basta
> trocar as leituras/escritas das rotas de `db` (mock) para `prisma` quando for
> ligar o banco. A estrutura foi separada de propósito para essa transição.

---

## ⭐ Z-API (recomendado — WhatsApp gerenciado na nuvem)

O [Z-API](https://z-api.io) cuida da conexão do WhatsApp **nos servidores deles** — sem
gateway local, sem ffmpeg, áudio já vai como nota de voz, e muito mais estável que o
Baileys self-hosted.

### Configuração
1. Crie uma conta e uma **instância** em https://app.z-api.io
2. Pegue: **Instance ID**, **Token** (da instância) e o **Client-Token** (em Segurança da conta)
3. No `.env` (ou nas Variables do Railway):
   ```
   WHATSAPP_MODE=zapi
   ZAPI_INSTANCE_ID=xxxxxxxx
   ZAPI_TOKEN=xxxxxxxx
   ZAPI_CLIENT_TOKEN=xxxxxxxx
   ```
4. No painel do Z-API, configure o **webhook "Ao receber"** apontando para:
   `https://SEU_APP/api/zapi/webhook`
5. Abra o app → **Configurações → Conexão** → escaneie o QR (vem do Z-API).

Pronto: enviar/receber texto, **áudio (nota de voz), imagem, vídeo e documento**, campanhas,
fluxos e automação por palavra-chave funcionam por cima do Z-API. Não precisa rodar `npm run wa`.

> Mídia enviada usa a URL pública do arquivo (`APP_URL` deve ser a URL pública do app, ex: domínio do Railway).

---

## 🟢 Conexão via WhatsApp Web (não-oficial, QR Code)

Conecta um número escaneando o QR (como o BotConversa nas conexões não-oficiais),
usando a biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys). Roda num
**gateway Node separado** porque exige conexão persistente.

```bash
# .env
WHATSAPP_MODE="web"

# Terminal 1 — app
npm run dev
# Terminal 2 — gateway WhatsApp Web
npm run wa
```

Depois: **Configurações → Conexão → Conectar WhatsApp** → escaneie o QR no celular
(WhatsApp → Aparelhos conectados → Conectar aparelho). O status fica "Conectado" e
mensagens passam a ser enviadas/recebidas pelo número real.

### ⚠️ Risco e proteção anti-ban
Conexão via WhatsApp Web **viola os Termos do WhatsApp** e tem risco de banimento do
número. Não elimina o risco — apenas reduz. O gateway já aplica:
- **Sessão persistida** em `.wa-auth/` + **reconexão automática** (não re-loga à toa).
- **Fila de envio** com **atrasos aleatórios** entre mensagens (`WA_MIN_DELAY_MS`/`WA_MAX_DELAY_MS`).
- **Simulação de "digitando"** (presence) antes de cada mensagem.
- **Limites por hora e por dia** (`WA_HOURLY_LIMIT`/`WA_DAILY_LIMIT`).
- Não força o número online 24h (`markOnlineOnConnect: false`).

Boas práticas que dependem de você: use um **chip aquecido**, **não dispare em massa**
para quem não pediu, evite muitos links e mídias logo de início, e respeite os limites.

---

## 🚂 Deploy no Railway (app + gateway juntos, com ffmpeg)

O projeto já vem com `Dockerfile` + `railway.json` que sobem o **app Next e o gateway
WhatsApp Web no mesmo container**, com **ffmpeg** instalado (necessário p/ nota de voz).

### Passos
1. Suba o repositório no GitHub.
2. No Railway: **New Project → Deploy from GitHub repo** (ele detecta o `Dockerfile`).
3. **Variáveis de ambiente** (Settings → Variables):
   ```
   WHATSAPP_MODE=web
   DATA_SOURCE=mock
   WA_AUTH_DIR=/data/wa-auth
   ```
   (As ligações app↔gateway por `localhost` já são configuradas pelo `scripts/start.mjs`.)
4. **Volume persistente** (Settings → Volumes): crie um volume e monte em **`/data`**.
   Isso guarda a sessão do WhatsApp (`/data/wa-auth`) — sem ele, pede QR a cada deploy.
5. Faça o deploy. Abra a URL pública → **Configurações → Conexão → Conectar** → escaneie o QR.

### Observações importantes
- **Mantenha 1 réplica** (a sessão do WhatsApp é única; múltiplas réplicas brigam pelo número e derrubam).
- O **gateway precisa ficar 24/7** — é por isso que rodar no Railway é melhor que local.
- Uploads recebidos ficam em `public/uploads` (efêmero entre deploys; a sessão é o que importa persistir).
- Rede estável de datacenter tende a **reduzir os timeouts** de handshake que aparecem em conexões locais.

> Build local da imagem (teste): `docker build -t conversaflow . && docker run -p 3000:3000 -v $PWD/.wa-auth:/data/wa-auth conversaflow`

---

## 📲 Integração com a WhatsApp Cloud API (oficial)

1. Crie um app na [Meta for Developers](https://developers.facebook.com/) e ative o produto **WhatsApp**.
2. Pegue `phone_number_id`, `WhatsApp Business Account ID` e um **Access Token**.
3. Preencha no `.env`: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN`.
4. Configure o **Webhook** apontando para `https://SEU_DOMINIO/api/webhook/whatsapp`
   usando o `WHATSAPP_VERIFY_TOKEN` do `.env` (a verificação `GET` já está implementada).
5. Com `DATA_SOURCE=db` e o token presente, `src/lib/whatsapp.ts` passa a chamar a
   Graph API de verdade em vez de logar no console.

> ⚠️ Usamos **somente a API oficial** (Cloud API). Nada de automação proibida via WhatsApp Web.
> Disparos fora da janela de 24h exigem **template aprovado** — já refletido na tela de Transmissão.

---

## 🏗️ Arquitetura

```
Front-end (Next.js + Tailwind)
        │  fetch
        ▼
API interna (app/api/*)  ──►  store mock  |  Prisma → PostgreSQL
        │
        ├─► flow-engine.ts  (executa fluxos)
        ├─► whatsapp.ts     (Cloud API oficial / mock)
        └─► queue.ts (BullMQ) ──► Redis ──► worker.ts (disparos + sequências)

Webhook WhatsApp (app/api/webhook/whatsapp) ──► palavra-chave → dispara fluxo
```

### Estrutura de pastas
```
prisma/                schema.prisma (todas as tabelas) + seed.ts
src/
  app/
    (app)/             telas autenticadas (sidebar): dashboard, contacts, campaigns,
                       broadcasts, inbox, automation, flows, settings, templates
    c/[slug]/          landing pública de entrada na campanha
    api/               contatos, campanhas, fluxos, inbox, broadcasts, templates,
                       automation, dashboard, settings, webhook/whatsapp
  components/          Sidebar, Topbar, ui, flow/ (FlowNode, Inspector, blocks)
  lib/                 prisma, mock-data, types, whatsapp, queue, flow-engine, worker, utils
```

---

## 🧱 Banco de dados (Prisma)

Tabelas: `User`, `Company`, `WhatsappAccount`, `Contact`, `Tag`, `ContactTag`,
`CustomField`, `QuickReply`, `BusinessHours`, `Conversation`, `Message`,
`Campaign`, `Flow`, `FlowNode`, `FlowEdge`, `Automation`, `Keyword`,
`Broadcast`, `Template`, `TeamMember`.

Veja [`prisma/schema.prisma`](prisma/schema.prisma).

---

## 🗺️ Próximos passos sugeridos
- Trocar as rotas de API do store mock para Prisma (camada já preparada).
- Autenticação real (NextAuth credentials) — schema de `User` já tem `passwordHash`.
- Persistir execução de fluxos por contato (estado do nó atual) para fluxos longos com delay.
- Multi-tenant: filtrar tudo por `companyId` na sessão.
```
