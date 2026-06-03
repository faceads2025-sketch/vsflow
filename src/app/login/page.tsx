"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, Lock } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-ink-faint">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } else {
      setError("Senha incorreta.");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-50 to-emerald-50 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-green text-white">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">ConversaFlow</h1>
          <p className="text-sm text-ink-soft">Entre para acessar o painel</p>
        </div>

        <label className="mb-1 block text-xs font-medium text-ink-soft">Senha</label>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3">
          <Lock className="h-4 w-4 text-ink-faint" />
          <input
            type="password"
            autoFocus
            className="w-full bg-transparent py-2.5 text-sm outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={loading || !password} className="btn-primary mt-5 w-full justify-center">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
