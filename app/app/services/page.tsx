// app/app/services/page.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase";

// Tipos alinhados com a tabela do Supabase
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

function formatBRLFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ServicesPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialLetter = userName?.trim().charAt(0).toUpperCase() ?? "M";

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);

      // 🔹 1. Carregar usuário
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        router.push("/auth/login");
        return;
      }

      const userId = authData.user.id;

      // 🔹 2. Carregar perfil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .maybeSingle();

      setUserName(profileData?.name ?? authData.user.email ?? "Usuário");

      // 🔹 3. Carregar serviços
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (servicesError) {
        setErrorMsg(servicesError.message);
        setServices([]);
      } else {
        setServices(servicesData || []);
      }

      setLoading(false);
    }

    loadData();
  }, [router, supabase]);

  async function handleCreateService(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !price.trim()) {
      setErrorMsg("Informe pelo menos o nome e o preço do serviço.");
      return;
    }

    // Tratar formatação de moeda: "80,00" ou "80.00" → número
    const cleanPrice = price.replace(/\./g, "").replace(",", ".");
    const numericPrice = parseFloat(cleanPrice);

    if (isNaN(numericPrice) || numericPrice <= 0) {
      setErrorMsg("Preço inválido. Use um valor como 80,00.");
      return;
    }

    setSaving(true);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      setSaving(false);
      router.push("/auth/login");
      return;
    }

    const priceCents = Math.round(numericPrice * 100);

    const { data: newService, error: insertError } = await supabase
      .from("services")
      .insert({
        user_id: authData.user.id,
        name: name.trim(),
        description: description.trim() || null,
        duration_minutes: duration,
        price_cents: priceCents,
        active: true,
      })
      .select("*")
      .single();

    if (insertError) {
      setErrorMsg(insertError.message || "Erro ao salvar o serviço.");
    } else if (newService) {
      setServices((prev) => [...prev, newService as Service]);
      setName("");
      setDescription("");
      setDuration(60);
      setPrice("");
    }

    setSaving(false);
  }

  async function toggleActive(service: Service) {
    const { data: updated, error: updateError } = await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id)
      .select("*")
      .single();

    if (!updateError && updated) {
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? (updated as Service) : s))
      );
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading && services.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Carregando seus serviços...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 px-5 py-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
            M
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Marcaí</p>
            <p className="text-xs text-slate-500">Painel do profissional</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <button
            onClick={() => router.push("/app")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Dashboard
          </button>

          <button
            onClick={() => router.push("/app/agendamentos")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Agendamentos
          </button>

          <button
            onClick={() => router.push("/app/services")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-indigo-50 text-indigo-700 font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            Serviços
          </button>

          {/* ✅ NOVO: Financeiro */}
          <button
            onClick={() => router.push("/app/financeiro")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Financeiro
          </button>
          <button
            onClick={() => router.push("/app/relatorios")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Relatórios
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
            {initialLetter}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-900 truncate">{userName}</p>
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
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg border border-slate-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-center">
            <h1 className="text-base font-semibold text-slate-900">Serviços</h1>
            <p className="text-xs text-slate-500">Catálogo do profissional</p>
          </div>
          <button onClick={handleLogout} className="text-xs text-slate-600">
            Sair
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white border-r border-slate-200 px-5 py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                  M
                </div>
                <span className="text-sm font-semibold">Marcaí</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-2xl">×</button>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/app");
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50"
              >
                Dashboard
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/app/agendamentos");
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50"
              >
                Agendamentos
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/app/services");
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-medium"
              >
                Serviços
              </button>

              {/* ✅ NOVO: Financeiro */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/app/financeiro");
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50"
              >
                Financeiro
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/app/relatorios");
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50"
              >
                Relatórios
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 min-w-0">
        <div className="lg:hidden h-16" />

        <motion.section
          className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div>
            <p className="text-xs font-medium text-slate-600">SERVIÇOS</p>
            <h1 className="text-2xl font-bold text-slate-900">Serviços oferecidos</h1>
            <p className="text-sm text-slate-600">Cadastre o que seus clientes podem agendar.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr,1fr] gap-6">
            {/* Lista de Serviços */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Seus serviços</h2>
                <span className="text-xs text-slate-500">
                  {services.length} {services.length === 1 ? "serviço" : "serviços"}
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-4">Ative/desative sem perder histórico.</p>

              {services.length === 0 ? (
                <p className="text-slate-600 text-center py-4">
                  Você ainda não cadastrou nenhum serviço.
                </p>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => (
                    <motion.div
                      key={service.id}
                      className="flex justify-between items-start gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50"
                      whileHover={{ x: 4 }}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{service.name}</p>
                        {service.description && (
                          <p className="text-sm text-slate-600 mt-1">{service.description}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          {service.duration_minutes} min • {formatBRLFromCents(service.price_cents)}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleActive(service)}
                        className={`text-xs px-3 py-1 rounded-full ${
                          service.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {service.active ? "Ativo" : "Inativo"}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulário */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-900">Novo serviço</h2>
              <p className="text-xs text-slate-600 mb-4">Crie um serviço para aparecer no agendamento.</p>

              <form onSubmit={handleCreateService} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-700 mb-1">Nome do serviço</label>
                  <input
                    type="text"
                    placeholder="Ex: Corte, Terapia, Aula..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-700 mb-1">Descrição (opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: atendimento online, sessão individual..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-700 mb-1">Duração (min)</label>
                    <input
                      type="number"
                      min={10}
                      step={5}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 mb-1">Preço (R$)</label>
                    <input
                      type="text"
                      placeholder="Ex: 80,00"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-red-50 text-red-800 text-sm px-3 py-2 rounded-lg">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-60 hover:bg-indigo-700 transition"
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
