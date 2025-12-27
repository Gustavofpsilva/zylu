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
      setErrorMsg("Digite um WhatsApp válido com DDD.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setErrorMsg("Erro ao criar usuário.");
      setLoading(false);
      return;
    }

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
      setErrorMsg(profileError.message);
      setLoading(false);
      return;
    }

    router.push("/app");
  }

  const previewSlug = companyName
    ? `/agenda/${slugify(companyName)}`
    : "/agenda/sua-empresa";

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
            Sua agenda organizada.
            <span className="block text-slate-400">
              Seu financeiro no controle.
            </span>
          </h1>

          <p className="text-slate-400 mt-4 max-w-md">
            Profissionais usam o Marcaí para agendar clientes e acompanhar ganhos
            sem planilhas nem mensagens.
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
              Criar conta gratuita
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Leva menos de 1 minuto. Sem cartão.
            </p>
          </div>

          <div className="space-y-4">
            <Input label="Nome" value={name} onChange={setName} />
            <Input
              label="Nome da empresa"
              value={companyName}
              onChange={setCompanyName}
              hint={`Seu link será ${previewSlug}`}
            />
            <Input
              label="WhatsApp"
              value={whatsapp}
              onChange={setWhatsapp}
              placeholder="(11) 99999-9999"
            />
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={setEmail}
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={setPassword}
            />
            <Input
              label="Confirmar senha"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
          </div>

          {errorMsg && (
            <p className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            onClick={handleSignup}
            disabled={loading}
            className="mt-6 w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-slate-800 transition disabled:opacity-60"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-600">
            Já tem conta?{" "}
            <button
              onClick={() => router.push("/auth/login")}
              className="font-medium text-slate-900 hover:underline"
            >
              Entrar
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
  hint?: string;
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
      {props.hint && (
        <p className="text-[11px] text-slate-500">{props.hint}</p>
      )}
    </div>
  );
}
