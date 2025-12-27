// app/app/relatorios/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

/* =======================
   TIPOS
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

function navButton(active: boolean) {
  return `w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition ${
    active
      ? "bg-slate-100 text-slate-900 font-medium"
      : "text-slate-700 hover:bg-slate-50"
  }`;
}

/* =======================
   PAGE
======================= */
export default function RelatoriosPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Usuário");
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Appointment[]>([]);

  /* =======================
     LOAD DATA
  ======================= */
  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/auth/login");
        return;
      }

      setUserId(auth.user.id);

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
    const byPayment: Record<string, number> = {};

    for (const r of rows) {
      const price = r.price_cents ?? 0;
      const discount = r.discount_cents ?? 0;
      const paid = r.paid_cents ?? 0;
      const total = Math.max(price - discount, 0);

      previsto += total;
      pago += paid;

      const service = r.services?.name ?? "Sem serviço";
      byService[service] = (byService[service] ?? 0) + paid;

      const method = r.payment_method ?? "outro";
      byPayment[method] = (byPayment[method] ?? 0) + paid;
    }

    return {
      previsto,
      pago,
      areceber: Math.max(previsto - pago, 0),
      ticketMedio: rows.length ? Math.round(pago / rows.length) : 0,
      byService,
      byPayment,
    };
  }, [rows]);

  const insights = useMemo(() => {
    const list: string[] = [];

    if (computed.areceber > 0) {
      list.push("⚠️ Você ainda tem valores a receber neste mês.");
    }

    if (computed.ticketMedio > 0) {
      list.push(`💡 Seu ticket médio é ${brl(computed.ticketMedio)}.`);
    }

    const pix = computed.byPayment["pix"] ?? 0;
    if (pix / (computed.pago || 1) > 0.5) {
      list.push("✅ PIX é sua principal forma de pagamento.");
    }

    const topService = Object.entries(computed.byService).sort((a, b) => b[1] - a[1])[0];
    if (topService && topService[1] > 0) {
      list.push(`⭐ ${topService[0]} é seu serviço mais rentável.`);
    }

    return list;
  }, [computed]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Carregando relatórios…</p>
      </main>
    );
  }

  const initialLetter = userName.charAt(0).toUpperCase();

  /* =======================
     UI
  ======================= */
  return (
    <main className="min-h-screen bg-[#F6F7FB] flex">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-slate-200 px-5 py-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-semibold">
            M
          </div>
          <div>
            <p className="text-sm font-semibold">Marcaí</p>
            <p className="text-[11px] text-slate-500">Painel do profissional</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <button className={navButton(false)} onClick={() => router.push("/app")}>Dashboard</button>
          <button className={navButton(false)} onClick={() => router.push("/app/agendamentos")}>Agendamentos</button>
          <button className={navButton(false)} onClick={() => router.push("/app/services")}>Serviços</button>
          <button className={navButton(false)} onClick={() => router.push("/app/financeiro")}>Financeiro</button>
          <button className={navButton(true)}>Relatórios</button>
        </nav>

        <div className="pt-4 border-t border-slate-200 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">
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
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 bg-[#F6F7FB] border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white"
          >
            ☰
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold">Relatórios</p>
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
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[280px] bg-white border-r border-slate-200 px-5 py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-semibold">
                  M
                </div>
                <span className="text-sm font-semibold">Marcaí</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-2xl">×</button>
            </div>

            <nav className="space-y-1 mb-6">
              <button
                className={navButton(false)}
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/app");
                }}
              >
                Dashboard
              </button>
              <button
                className={navButton(false)}
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/app/agendamentos");
                }}
              >
                Agendamentos
              </button>
              <button
                className={navButton(false)}
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/app/services");
                }}
              >
                Serviços
              </button>
              <button
                className={navButton(false)}
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/app/financeiro");
                }}
              >
                Financeiro
              </button>
              <button className={navButton(true)}>Relatórios</button>
            </nav>

            {/* ✅ Informações do usuário no mobile drawer */}
            <div className="pt-4 border-t border-slate-200 flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">
                {initialLetter}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate">{userName}</p>
                <p className="text-[11px] text-slate-500">Conta profissional</p>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="ml-auto text-[11px] text-slate-500 hover:text-red-600"
              >
                Sair
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 min-w-0">
        <div className="lg:hidden h-[73px]" />

        <motion.section
          className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <header>
            <p className="text-xs text-slate-500">RELATÓRIOS</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {monthLabel(new Date())}
            </h1>
          </header>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi title="Previsto" value={brl(computed.previsto)} />
            <Kpi title="Pago" value={brl(computed.pago)} />
            <Kpi title="A receber" value={brl(computed.areceber)} />
            <Kpi title="Ticket médio" value={brl(computed.ticketMedio)} />
          </div>

          {/* INSIGHTS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-semibold mb-3">Insights automáticos</p>
            <ul className="space-y-1 text-sm text-slate-700">
              {insights.map((i, idx) => (
                <li key={idx}>{i}</li>
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
function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-2xl font-semibold mt-2">{value}</p>
    </div>
  );
}