"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderPlus, Workflow, MoreVertical, Star, Trash2 } from "lucide-react";
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
  const [menuId, setMenuId] = useState<string | null>(null);
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

  async function setDefault(id: string) {
    setMenuId(null);
    await fetch(`/api/flows/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isDefault: true }) });
    load();
  }

  async function removeFlow(id: string, name: string) {
    setMenuId(null);
    if (!confirm(`Excluir o fluxo "${name}"? Esta ação não pode ser desfeita.`)) return;
    await fetch(`/api/flows/${id}`, { method: "DELETE" });
    load();
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
            <div key={f.id} className="card group relative p-5 transition hover:shadow-soft">
              {/* área clicável -> abre o construtor */}
              <button className="absolute inset-0 z-0" onClick={() => router.push(`/flows/${f.id}`)} aria-label={`Abrir ${f.name}`} />

              <div className="pointer-events-none relative z-[1]">
                <div className="mb-3 flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-500">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <Badge color={f.status === "published" ? "green" : "gray"}>{f.status === "published" ? "Publicado" : "Rascunho"}</Badge>
                </div>
                <p className="font-semibold">{f.name}</p>
                <p className="mt-0.5 line-clamp-1 text-sm text-ink-faint">{f.description || "Sem descrição"}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-ink-faint">
                  <span>{f.nodeCount} blocos • {f.executions} execuções</span>
                  <span>{formatDate(f.updatedAt)}</span>
                </div>
                {f.isDefault && <p className="mt-2 text-xs font-medium text-brand-500">★ Fluxo de boas-vindas</p>}
              </div>

              {/* menu de ações */}
              <div className="absolute right-3 top-3 z-[2]">
                <button
                  onClick={() => setMenuId(menuId === f.id ? null : f.id)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition hover:bg-gray-100"
                  aria-label="Ações"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuId === f.id && (
                  <>
                    <div className="fixed inset-0 z-[2]" onClick={() => setMenuId(null)} />
                    <div className="absolute right-0 z-[3] mt-1 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-soft">
                      {!f.isDefault && (
                        <button onClick={() => setDefault(f.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                          <Star className="h-4 w-4 text-brand-500" /> Definir como padrão (boas-vindas)
                        </button>
                      )}
                      <button onClick={() => removeFlow(f.id, f.name)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" /> Excluir fluxo
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
