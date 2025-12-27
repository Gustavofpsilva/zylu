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
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-950">
      {/* LEFT / BRAND */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-2xl bg-white text-slate-950 flex items-center justify-center font-semibold text-lg">
              M
            </div>
            <span className="text-lg font-semibold">Marcaí</span>
          </div>

          <h1 className="text-4xl font-semibold leading-tight max-w-md">
            Bem-vindo de volta.
            <span className="block text-slate-400">
              Seus atendimentos te esperam.
            </span>
          </h1>

          <p className="text-slate-400 mt-4 max-w-md">
            Acesse sua agenda, acompanhe pagamentos e veja exatamente
            quanto você já ganhou — tudo em um só lugar.
          </p>
        </div>

        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Marcaí
        </p>
      </div>

      {/* RIGHT / FORM */}
      <div className="flex items-center justify-center px-4 py-12 bg-slate-50">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 shadow-sm"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900">
              Entrar na sua conta
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Acesse o painel do profissional.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="seu@email.com"
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="********"
            />
          </div>

          {errorMsg && (
            <p className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-6 w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-slate-800 transition disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-600">
            Ainda não tem conta?{" "}
            <button
              onClick={() => router.push("/auth/signup")}
              className="font-medium text-slate-900 hover:underline"
            >
              Criar conta
            </button>
          </p>
        </motion.div>
      </div>
    </main>
  );
}

/* ===== Components ===== */

function Input(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-700">
        {props.label}
      </label>
      <input
        type={props.type ?? "text"}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-slate-900"
      />
    </div>
  );
}
