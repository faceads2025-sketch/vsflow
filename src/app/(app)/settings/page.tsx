"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge } from "@/components/ui";
import WhatsAppConnect from "@/components/WhatsAppConnect";
import IntegrationSettings from "@/components/IntegrationSettings";

const sections = [
  "Conexão",
  "Integração",
  "Campos",
  "Etiquetas",
  "Respostas rápidas",
  "Equipe",
  "Horários",
  "Fluxos Padrões",
  "Companhia",
  "Registros",
  "Faturamento",
] as const;

export default function SettingsPage() {
  const [active, setActive] = useState<(typeof sections)[number]>("Conexão");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setData);
  }, []);

  return (
    <div className="pb-12">
      <PageHeader title="Configurações" />
      <div className="flex gap-8 px-8">
        <nav className="w-48 shrink-0 space-y-1">
          {sections.map((s) => (
            <button key={s} onClick={() => setActive(s)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${active === s ? "bg-brand-50 text-brand-600" : "text-ink-soft hover:bg-gray-50"}`}>
              {s}
            </button>
          ))}
        </nav>

        <div className="flex-1">
          {!data ? (
            <p className="text-ink-faint">Carregando...</p>
          ) : (
            <>
              {active === "Conexão" && <WhatsAppConnect />}

              {active === "Integração" && <IntegrationSettings />}

              {active === "Campos" && (
                <Table cols={["Nome", "Chave", "Tipo"]} rows={data.customFields.map((f: any) => [f.name, f.key, f.type])} />
              )}

              {active === "Etiquetas" && (
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((t: any) => (
                    <span key={t.id} className="pill" style={{ background: t.color + "22", color: t.color }}>{t.name}</span>
                  ))}
                </div>
              )}

              {active === "Respostas rápidas" && (
                <Table cols={["Atalho", "Conteúdo"]} rows={data.quickReplies.map((q: any) => [q.shortcut, q.content])} />
              )}

              {active === "Equipe" && (
                <Table cols={["Nome", "E-mail", "Função", "Status"]} rows={data.team.map((m: any) => [m.name, m.email, m.role, m.status])} />
              )}

              {active === "Horários" && (
                <div className="card p-6 text-sm text-ink-soft">
                  <p className="mb-3 font-semibold text-ink">Horário de atendimento</p>
                  {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map((d) => (
                    <div key={d} className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0">
                      <span>{d}</span><span>09:00 – 18:00</span>
                    </div>
                  ))}
                </div>
              )}

              {active === "Fluxos Padrões" && (
                <div className="space-y-3">
                  {["Fluxo de resposta padrão", "Fluxo padrão para mídia", "Fluxo Pós-Atendimento"].map((label) => (
                    <div key={label} className="card flex items-center justify-between p-4">
                      <span className="text-sm font-medium">{label}</span>
                      <select className="input max-w-xs">
                        <option>Nenhum</option>
                        {data.flows.map((f: any) => <option key={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {active === "Companhia" && (
                <div className="card space-y-3 p-6">
                  <Field label="Nome da companhia" value={data.account.companyName} />
                  <Field label="ID" value={data.account.companyId} />
                  <Field label="Número conectado" value={data.account.phoneNumber} />
                </div>
              )}

              {active === "Registros" && (
                <div className="card p-6 text-sm text-ink-soft">Nenhum registro recente.</div>
              )}

              {active === "Faturamento" && (
                <div className="card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Plano Starter</p>
                      <p className="text-sm text-ink-soft">2.000 contatos • disparos limitados</p>
                    </div>
                    <Badge color="green">Ativo</Badge>
                  </div>
                  <button className="btn-primary mt-4">Fazer upgrade</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Table({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-ink-faint">
            {cols.map((c) => <th key={c} className="px-6 py-3 font-medium">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0">
              {r.map((cell, j) => <td key={j} className="px-6 py-3 text-ink-soft">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-soft">{label}</label>
      <input className="input" defaultValue={value} />
    </div>
  );
}
