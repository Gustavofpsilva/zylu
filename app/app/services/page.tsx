"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase";

/* =======================
   TYPES
======================= */
type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  active: boolean;
  user_id: string;
  created_at: string;
};

/* =======================
   HELPERS
======================= */
function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function navItem(active: boolean) {
  return `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
    active
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-100"
  }`;
}

/* =======================
   PAGE
======================= */
export default function ServicesPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [userName, setUserName] = useState("Usuário");

  // form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* =======================
     LOAD
  ======================= */
  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", auth.user.id)
        .maybeSingle();

      setUserName(profile?.name ?? auth.user.email ?? "Usuário");

      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: true });

      setServices((data ?? []) as Service[]);
      setLoading(false);
    }

    load();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  /* =======================
     ACTIONS
  ======================= */
  async function handleCreateService(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !price.trim()) {
      setErrorMsg("Informe nome e preço.");
      return;
    }

    const numericPrice = parseFloat(price.replace(".", "").replace(",", "."));
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setErrorMsg("Preço inválido.");
      return;
    }

    setSaving(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data, error } = await supabase
      .from("services")
      .insert({
        user_id: auth.user.id,
        name: name.trim(),
        description: description.trim() || null,
        duration_minutes: duration,
        price_cents: Math.round(numericPrice * 100),
        active: true,
      })
      .select("*")
      .single();

    if (error) {
      setErrorMsg(error.message);
    } else {
      setServices((prev) => [...prev, data as Service]);
      setName("");
      setDescription("");
      setDuration(60);
      setPrice("");
    }

    setSaving(false);
  }

  async function toggleActive(service: Service) {
    const { data } = await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id)
      .select("*")
      .single();

    if (data) {
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? (data as Service) : s))
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Carregando serviços…</p>
      </main>
    );
  }

  const initialLetter = userName.charAt(0).toUpperCase();

  /* =======================
     UI
  ======================= */
  return (
    <main className="min-h-screen bg-slate-50 flex">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-white border-r border-slate-200 px-5 py-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-semibold">
            M
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Marcaí</p>
            <p className="text-[11px] text-slate-500">Painel</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <button onClick={() => router.push("/app")} className={navItem(false)}>
            Dashboard
          </button>
          <button onClick={() => router.push("/app/agendamentos")} className={navItem(false)}>
            Agendamentos
          </button>
          <button className={navItem(true)}>
            Serviços
          </button>
          <button onClick={() => router.push("/app/financeiro")} className={navItem(false)}>
            Financeiro
          </button>
          <button onClick={() => router.push("/app/relatorios")} className={navItem(false)}>
            Relatórios
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">
            {initialLetter}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-900 truncate">
              {userName}
            </p>
            <p className="text-[11px] text-slate-500">Conta profissional</p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-auto text-[11px] text-slate-500 hover:text-red-600"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 rounded-xl border border-slate-200 bg-white"
          >
            ☰
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-900">Serviços</p>
            <p className="text-[11px] text-slate-500">Catálogo</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-[11px] text-slate-600 hover:text-red-600"
          >
            Sair
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[260px] bg-white px-5 py-6">
            <nav className="space-y-1 mt-8">
              <button onClick={() => router.push("/app")} className={navItem(false)}>Dashboard</button>
              <button onClick={() => router.push("/app/agendamentos")} className={navItem(false)}>Agendamentos</button>
              <button className={navItem(true)}>Serviços</button>
              <button onClick={() => router.push("/app/financeiro")} className={navItem(false)}>Financeiro</button>
              <button onClick={() => router.push("/app/relatorios")} className={navItem(false)}>Relatórios</button>
            </nav>
          </aside>
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 min-w-0">
        <div className="lg:hidden h-[72px]" />

        <motion.section
          className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <header>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Serviços
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Serviços oferecidos
            </h1>
            <p className="text-sm text-slate-600">
              Cadastre o que seus clientes podem agendar.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr,1fr] gap-6">
            {/* LIST */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5">
              <div className="flex justify-between mb-4">
                <p className="text-sm font-semibold">Seus serviços</p>
                <span className="text-xs text-slate-500">
                  {services.length} cadastrados
                </span>
              </div>

              {services.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Nenhum serviço cadastrado ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {services.map((s) => (
                    <motion.div
                      key={s.id}
                      className="flex items-start justify-between gap-3 p-4 border border-slate-200 rounded-2xl hover:bg-slate-50"
                      whileHover={{ x: 4 }}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {s.name}
                        </p>
                        {s.description && (
                          <p className="text-sm text-slate-600 mt-1">
                            {s.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          {s.duration_minutes} min • {brl(s.price_cents)}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleActive(s)}
                        className={`text-xs px-3 py-1 rounded-full ${
                          s.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {s.active ? "Ativo" : "Inativo"}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* FORM */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5">
              <p className="text-sm font-semibold mb-1">Novo serviço</p>
              <p className="text-xs text-slate-600 mb-4">
                Crie um serviço para aparecer no agendamento.
              </p>

              <form onSubmit={handleCreateService} className="space-y-4">
                <Input label="Nome do serviço" value={name} onChange={setName} />
                <Input
                  label="Descrição"
                  value={description}
                  onChange={setDescription}
                  optional
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Duração (min)"
                    type="number"
                    value={String(duration)}
                    onChange={(v) => setDuration(Number(v))}
                  />
                  <Input
                    label="Preço (R$)"
                    value={price}
                    onChange={setPrice}
                    placeholder="80,00"
                  />
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {errorMsg}
                  </p>
                )}

                <button
                  disabled={saving}
                  className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-60 transition"
                >
                  {saving ? "Salvando..." : "Salvar serviço"}
                </button>
              </form>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

/* =======================
   COMPONENTS
======================= */
function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700">
        {label} {optional && <span className="text-slate-400">(opcional)</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
      />
    </div>
  );
}
