"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin() {
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Preencha todos os campos.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message);
      return;
    }

    router.push("/app");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Top bar simples (mesmo vibe do app) */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
          >
            <span aria-hidden>←</span>
            Voltar
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center font-semibold">
              M
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Marcaí</p>
              <p className="text-[11px] text-slate-500">Acesse sua conta</p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Lado esquerdo (copy) */}
          <div className="hidden lg:block">
            <p className="text-xs text-slate-500">Login</p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-2">
              Bem-vindo de volta 👋
            </h1>
            <p className="text-slate-600 mt-2 max-w-md">
              Entre para ver seus agendamentos, controlar pagamentos e acompanhar
              o que está previsto, pago e a receber.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 max-w-md">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Financeiro claro
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Pagamento parcial, desconto e método de pagamento no mesmo
                  lugar.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Exportação fácil
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Gere CSV/PDF do período para controle e contabilidade.
                </p>
              </div>
            </div>
          </div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center font-semibold text-lg">
                  M
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Entrar na Marcaí
                  </p>
                  <p className="text-xs text-slate-500">
                    Acesse seu painel do profissional
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Senha
                  </label>
                  <input
                    type="password"
                    placeholder="********"
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mt-4">
                  {errorMsg}
                </p>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full mt-6 bg-[var(--color-primary)] text-white py-2.5 rounded-full text-sm font-medium hover:opacity-95 transition disabled:opacity-60"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>

              <div className="mt-4 text-center">
                <p className="text-xs text-slate-600">
                  Ainda não tem conta?{" "}
                  <button
                    onClick={() => router.push("/auth/signup")}
                    className="text-[var(--color-primary)] font-medium hover:underline"
                    type="button"
                  >
                    Criar conta
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
