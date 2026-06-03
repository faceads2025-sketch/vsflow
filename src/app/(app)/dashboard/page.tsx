import { db } from "@/lib/mock-data";
import { Stat } from "@/components/ui";
import Topbar from "@/components/Topbar";
import { UserCheck, Reply, Archive } from "lucide-react";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const total = db.conversations.length;
  const botReplied = db.conversations.filter((c) => c.messages.some((m) => m.fromBot)).length;
  const botPct = total ? Math.round((botReplied / total) * 100) : 0;
  const closed = db.conversations.filter((c) => c.status === "closed").length;
  const firstResponses = db.conversations.filter((c) => c.messages.some((m) => m.direction === "outbound")).length;
  const assignments = db.conversations.filter((c) => c.assignedTo).length;

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

function PerfCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-6 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-500">{icon}</div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}
