"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FolderPlus, Workflow } from "lucide-react";
import { PageHeader, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface FlowListItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  isDefault: boolean;
  executions: number;
  ctr: number;
  updatedAt: string;
  nodeCount: number;
}

export default function FlowsPage() {
  const [flows, setFlows] = useState<FlowListItem[]>([]);
  const router = useRouter();

  async function load() {
    setFlows(await fetch("/api/flows").then((r) => r.json()));
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    const f = await fetch("/api/flows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Novo fluxo" }) }).then((r) => r.json());
    router.push(`/flows/${f.id}`);
  }

  return (
    <div className="pb-12">
      <PageHeader
        title="Fluxos de conversa"
        action={
          <div className="flex gap-2">
            <button className="btn-ghost"><FolderPlus className="h-4 w-4" /> Criar Pasta</button>
            <button className="btn-primary" onClick={create}><Plus className="h-4 w-4" /> Criar Novo Fluxo</button>
          </div>
        }
      />
      <div className="px-4 sm:px-8">
        <p className="pb-3 text-sm font-medium text-ink-soft">Todos os Fluxos</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flows.map((f) => (
            <Link key={f.id} href={`/flows/${f.id}`} className="card group p-5 transition hover:shadow-soft">
              <div className="mb-3 flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-500">
                  <Workflow className="h-5 w-5" />
                </div>
                <Badge color={f.status === "published" ? "green" : "gray"}>{f.status === "published" ? "Publicado" : "Rascunho"}</Badge>
              </div>
              <p className="font-semibold group-hover:text-brand-600">{f.name}</p>
              <p className="mt-0.5 line-clamp-1 text-sm text-ink-faint">{f.description || "Sem descrição"}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-ink-faint">
                <span>{f.nodeCount} blocos • {f.executions} execuções</span>
                <span>{formatDate(f.updatedAt)}</span>
              </div>
              {f.isDefault && <p className="mt-2 text-xs font-medium text-brand-500">★ Fluxo de boas-vindas</p>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
