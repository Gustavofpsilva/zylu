"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

/* =======================
   TYPES
======================= */
type Appointment = {
  starts_at: string;
  price_cents: number | null;
  discount_cents: number | null;
  paid_cents: number | null;
  payment_method: string | null;
  services?: { name: string } | null;
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

function monthLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
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
export default function RelatoriosPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState("Usuário");
  const [rows, setRows] = useState<Appointment[]>([]);

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

      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("appointments")
        .select(`
          starts_at,
          price_cents,
          discount_cents,
          paid_cents,
          payment_method,
          services:service_id ( name )
        `)
        .gte("starts_at", start.toISOString());

      const normalized: Appointment[] = ((data ?? []) as any[]).map((r) => ({
        ...r,
        services: Array.isArray(r.services) ? r.services[0] ?? null : r.services ?? null,
      }));

      setRows(normalized);
      setLoading(false);
    }

    load();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  /* =======================
     CALCULOS
  ======================= */
  const computed = useMemo(() => {
    let previsto = 0;
    let pago = 0;
    const byService: Record<string, number> = {};

    for (const r of rows) {
      const total = Math.max((r.price_cents ?? 0) - (r.discount_cents ?? 0), 0);
      previsto += total;
      pago += r.paid_cents ?? 0;

      const service = r.services?.name ?? "Sem serviço";
      byService[service] = (byService[service] ?? 0) + (r.paid_cents ?? 0);
    }

    const topService = Object.entries(byService).sort((a, b) => b[1] - a[1])[0];

    return {
      previsto,
      pago,
      areceber: Math.max(previsto - pago, 0),
      ticketMedio: rows.length ? Math.round(pago / rows.length) : 0,
      topService,
    };
  }, [rows]);

  const insights = useMemo(() => {
    const list: string[] = [];

    if (computed.areceber > 0) {
      list.push("Você ainda tem valores a receber neste mês.");
    }

    if (computed.ticketMedio > 0) {
      list.push(`Seu ticket médio é ${brl(computed.ticketMedio)}.`);
    }

    if (computed.topService) {
      list.push(`${computed.topService[0]} é seu serviço mais rentável.`);
    }

    return list;
  }, [computed]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Gerando relatório…</p>
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
          <button onClick={() => router.push("/app/services")} className={navItem(false)}>
            Serviços
          </button>
          <button onClick={() => router.push("/app/financeiro")} className={navItem(false)}>
            Financeiro
          </button>
          <button className={navItem(true)}>
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
            <p className="text-sm font-semibold text-slate-900">Relatórios</p>
            <p className="text-[11px] text-slate-500">Visão estratégica</p>
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
              <button onClick={() => router.push("/app/services")} className={navItem(false)}>Serviços</button>
              <button onClick={() => router.push("/app/financeiro")} className={navItem(false)}>Financeiro</button>
              <button className={navItem(true)}>Relatórios</button>
            </nav>
          </aside>
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 min-w-0">
        <div className="lg:hidden h-[72px]" />

        <motion.section
          className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* HEADER */}
          <header>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Relatório mensal
            </p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-1">
              {monthLabel(new Date())}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Visão geral do desempenho do seu negócio.
            </p>
          </header>

          {/* HERO */}
          <div className="bg-slate-900 text-white rounded-3xl p-8">
            <p className="text-sm text-slate-300">Total recebido no mês</p>
            <p className="text-4xl font-semibold mt-2">
              {brl(computed.pago)}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-400">Previsto</p>
                <p className="text-lg font-medium">
                  {brl(computed.previsto)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">A receber</p>
                <p className="text-lg font-medium">
                  {brl(computed.areceber)}
                </p>
              </div>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Stat
              title="Ticket médio"
              value={brl(computed.ticketMedio)}
              description="Valor médio por atendimento"
            />
            <Stat
              title="Atendimentos"
              value={String(rows.length)}
              description="Realizados no período"
            />
          </div>

          {/* INSIGHTS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6">
            <p className="text-sm font-semibold text-slate-900 mb-3">
              Insights do mês
            </p>
            <ul className="space-y-2 text-sm text-slate-700">
              {insights.map((i, idx) => (
                <li key={idx}>• {i}</li>
              ))}
            </ul>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

/* =======================
   COMPONENTS
======================= */
function Stat({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-2">{value}</p>
      <p className="text-xs text-slate-600 mt-1">{description}</p>
    </div>
  );
}
