"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

function normalizeWhatsapp(input: string) {
  // Mantém só dígitos. Ex: "(11) 99999-9999" -> "11999999999"
  // Você pode decidir depois se quer forçar DDI 55, etc.
  return (input || "").replace(/\D/g, "");
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSignup() {
    setErrorMsg(null);

    if (!name || !companyName || !whatsapp || !email || !password) {
      setErrorMsg("Preencha todos os campos.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("As senhas não conferem.");
      return;
    }

    const whatsappDigits = normalizeWhatsapp(whatsapp);
    if (whatsappDigits.length < 10) {
      setErrorMsg("Digite um WhatsApp válido (com DDD).");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setErrorMsg("Erro desconhecido ao criar usuário.");
      setLoading(false);
      return;
    }

    // ✅ slug agora vem do company_name
    const userSlug = slugify(companyName);

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      name,
      company_name: companyName,
      slug: userSlug,
      whatsapp: whatsappDigits,
      created_at: new Date().toISOString(),
    });

    if (profileError) {
      setErrorMsg("Erro ao criar perfil: " + profileError.message);
      setLoading(false);
      return;
    }

    router.push("/app");
  }

  const previewSlug = companyName ? `/agenda/${slugify(companyName)}` : "/agenda/sua-empresa";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Top bar */}
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
              <p className="text-[11px] text-slate-500">Crie sua conta</p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Copy */}
          <div className="hidden lg:block">
            <p className="text-xs text-slate-500">Cadastro</p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-2">
              Comece em poucos minutos ✨
            </h1>
            <p className="text-slate-600 mt-2 max-w-md">
              Crie sua conta, cadastre seus serviços e comece a receber
              agendamentos com o link público da sua agenda.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 max-w-md">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Controle do financeiro
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Use previsto, pago e a receber para enxergar o mês inteiro.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Notificação no WhatsApp
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Receba aviso automático quando um cliente marcar horário.
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
                  <p className="text-sm font-semibold text-slate-900">Criar conta</p>
                  <p className="text-xs text-slate-500">Leva menos de 1 minuto</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Nome</label>
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Nome da empresa</label>
                  <input
                    type="text"
                    placeholder="Ex: Studio Beleza da Ana"
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Esse nome vira seu link: <span className="font-medium">{previewSlug}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">WhatsApp da empresa</label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Vamos usar esse número para enviar alertas de novos agendamentos.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">E-mail</label>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Senha</label>
                  <input
                    type="password"
                    placeholder="********"
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Confirmar senha</label>
                  <input
                    type="password"
                    placeholder="********"
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mt-4">
                  {errorMsg}
                </p>
              )}

              <button
                onClick={handleSignup}
                disabled={loading}
                className="w-full mt-6 bg-[var(--color-primary)] text-white py-2.5 rounded-full text-sm font-medium hover:opacity-95 transition disabled:opacity-60"
              >
                {loading ? "Criando..." : "Criar conta"}
              </button>

              <div className="mt-4 text-center">
                <p className="text-xs text-slate-600">
                  Já tem conta?{" "}
                  <button
                    onClick={() => router.push("/auth/login")}
                    className="text-[var(--color-primary)] font-medium hover:underline"
                    type="button"
                  >
                    Entrar
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
