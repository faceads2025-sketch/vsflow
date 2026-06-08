import { db } from "@/lib/mock-data";
import { Stat } from "@/components/ui";
import Topbar from "@/components/Topbar";
import { UserCheck, Reply, Archive, Users, CheckCircle2, Clock, TrendingUp, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const total = db.conversations.length;
  const botReplied = db.conversations.filter((c) => c.messages.some((m) => m.fromBot)).length;
  const botPct = total ? Math.round((botReplied / total) * 100) : 0;
  const closed = db.conversations.filter((c) => c.status === "closed").length;
  const firstResponses = db.conversations.filter((c) => c.messages.some((m) => m.direction === "outbound")).length;
  const assignments = db.conversations.filter((c) => c.assignedTo).length;

  // ===== Conversão (a partir do pipeline + leads que chegaram) =====
  // conta contatos pelas colunas do pipeline, casando pelo nome (funciona mesmo com colunas customizadas)
  const countByCol = (matcher: (name: string) => boolean) => {
    const ids = new Set(db.pipelineColumns.filter((c) => matcher(c.name.toLowerCase())).map((c) => c.id));
    return db.contacts.filter((c) => c.pipelineColumnId && ids.has(c.pipelineColumnId)).length;
  };
  const entraram = db.contacts.length; // todo mundo que chegou no app
  const compraram = countByCol((n) => (n.includes("pagou") && !n.includes("não") && !n.includes("nao")) || n.includes("comprou") || n.includes("pago"));
  const aguardando = countByCol((n) => n.includes("aguard"));
  const naoPagou = countByCol((n) => n.includes("não pagou") || n.includes("nao pagou") || n.includes("perdido"));
  const taxaConversao = entraram ? Math.round((compraram / entraram) * 100) : 0;

  return (
    <div className="pb-12">
      <Topbar />
      <div className="px-4 sm:px-8">
        <div className="mt-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Bem-vindo, Kennedy <span className="align-middle">👋</span>
          </h2>
          <p className="mt-1 text-sm text-ink-faint">{db.account.companyName} • espaço de trabalho</p>
        </div>

        {/* Conversão de leads */}
        <section className="mt-8">
          <h3 className="mb-4 text-lg font-semibold">Conversão de leads <span className="text-sm font-normal text-ink-faint">• do pipeline</span></h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ConvCard icon={<Users className="h-5 w-5" />} value={entraram} label="Entraram" accent="#3FC8E4" sub="leads que chegaram" />
            <ConvCard icon={<CheckCircle2 className="h-5 w-5" />} value={compraram} label="Compraram" accent="#10B981" sub="coluna Pagou" />
            <ConvCard icon={<Clock className="h-5 w-5" />} value={aguardando} label="Aguardando" accent="#F59E0B" sub="aguardando resposta" />
            <ConvCard icon={<XCircle className="h-5 w-5" />} value={naoPagou} label="Não pagou / perdido" accent="#EF4444" sub="não converteram" />
          </div>

          {/* taxa de conversão em destaque */}
          <div className="card mt-4 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-600"><TrendingUp className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm text-ink-soft">Taxa de conversão</p>
                  <p className="text-xs text-ink-faint">{compraram} compras de {entraram} leads</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{taxaConversao}%</p>
            </div>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, taxaConversao)}%` }} />
            </div>
          </div>
        </section>

        {/* Gerenciamento de chats */}
        <section className="mt-8">
          <h3 className="mb-4 text-lg font-semibold">Gerenciamento de chats <span className="text-sm font-normal text-ink-faint">• Este mês</span></h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <span className="h-12 w-1.5 rounded-full bg-brand-400" />
                <div>
                  <p className="text-sm text-ink-soft">Conversas</p>
                  <p className="text-2xl font-bold">{total} <span className="text-base font-medium text-ink-faint">(100%)</span></p>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <span className="h-12 w-1.5 rounded-full bg-amber-300" />
                <div>
                  <p className="text-sm text-ink-soft">Chatbot respondeu</p>
                  <p className="text-2xl font-bold">{botReplied} <span className="text-base font-medium text-ink-faint">({botPct}%)</span></p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Desempenho */}
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-3">
            <h3 className="text-lg font-semibold">Desempenho</h3>
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">Equipe</span>
            <span className="text-sm text-ink-faint">Pessoal</span>
            <span className="ml-auto text-sm text-ink-faint">Este mês</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <PerfCard icon={<UserCheck className="h-5 w-5" />} value={assignments} label="Atribuições" />
            <PerfCard icon={<Reply className="h-5 w-5" />} value={firstResponses} label="Primeiras respostas" />
            <PerfCard icon={<Archive className="h-5 w-5" />} value={closed} label="Chats fechados" />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Stat label="Até a primeira resposta (mediana)" value="2m 30s" />
            <Stat label="Até o fechamento (mediana)" value="18m" />
          </div>
        </section>
      </div>
    </div>
  );
}

function ConvCard({ icon, value, label, accent, sub }: { icon: React.ReactNode; value: number; label: string; accent: string; sub: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-full" style={{ backgroundColor: `${accent}1a`, color: accent }}>{icon}</span>
        <span className="h-8 w-1 rounded-full" style={{ backgroundColor: accent }} />
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="text-xs text-ink-faint">{sub}</p>
    </div>
  );
}

function PerfCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-6 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-500">{icon}</div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}
