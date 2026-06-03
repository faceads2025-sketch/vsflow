"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { MessageSquare } from "lucide-react";

export default function CampaignLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState({ name: "", phone: "" });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function join() {
    setLoading(true);
    const res = await fetch(`/api/campaigns/${slug}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-50 to-emerald-50 p-4">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-green text-white">
          <MessageSquare className="h-6 w-6" />
        </div>
        {!result ? (
          <>
            <h1 className="text-xl font-bold">Entrar na campanha</h1>
            <p className="mt-1 text-sm text-ink-soft">Preencha para iniciar o atendimento no WhatsApp.</p>
            <div className="mt-5 space-y-3 text-left">
              <input className="input" placeholder="Seu nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="input" placeholder="Seu WhatsApp (+55...)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <button className="btn-primary mt-5 w-full justify-center" disabled={loading || !form.phone} onClick={join}>
              {loading ? "Entrando..." : "Quero participar"}
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Tudo certo! 🎉</h1>
            <p className="mt-1 text-sm text-ink-soft">Você entrou na campanha <b>{result.campaign}</b> e o fluxo foi iniciado.</p>
            {result.flowRun?.steps && (
              <div className="mt-4 space-y-1 rounded-xl bg-gray-50 p-4 text-left text-xs">
                {result.flowRun.steps.map((s: any, i: number) => (
                  <p key={i} className="text-ink-soft">• {s.action}</p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
