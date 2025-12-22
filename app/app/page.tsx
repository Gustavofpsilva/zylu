// app/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

// ===== Types =====
type AppointmentRow = {
  id: string;
  starts_at: string;
  client_phone: string | null;
  price_cents: number | null;
  paid_cents: number | null;
  discount_cents: number | null;
  payment_method: string | null;
  status: string | null;
  services?: { name: string } | null;
};

type ExpenseRow = {
  id: string;
  description: string;
  category: string;
  amount_cents: number;
  date: string; // YYYY-MM-DD
  recurring: boolean;
};

type Period = "week" | "month";
type Metric = "previsto" | "pago" | "areceber";
type RankMode = "qtd" | "receita";

// ===== Helpers =====
function formatBRLFromCents(cents: number) {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfPeriod(period: Period) {
  const d = startOfToday();
  if (period === "week") {
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
  } else {
    d.setDate(1);
  }
  return d;
}

function endOfTodayInclusiveIso() {
  const to = startOfToday();
  const end = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1);
  return end.toISOString();
}

function daysInRange(from: Date, to: Date) {
  const arr: Date[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    arr.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return arr;
}

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function niceDayLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function navButton(active: boolean) {
  return `w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition ${
    active ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
  }`;
}

// CSV helpers
function csvEscape(value: string) {
  const v = value ?? "";
  const needsQuotes = /[;\n",]/.test(v);
  const escaped = v.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AppDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [userSlug, setUserSlug] = useState<string | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const [period, setPeriod] = useState<Period>("week");
  const [metric, setMetric] = useState<Metric>("pago");
  const [rankMode, setRankMode] = useState<RankMode>("qtd");

  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  const [fetching, setFetching] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Load user/profile
  useEffect(() => {
    async function loadUser() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push("/auth/login");
        return;
      }

      const userId = authData.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, slug, company_name")
        .eq("id", userId)
        .maybeSingle();

      const dn =
        (profile as any)?.company_name?.trim() ||
        (profile as any)?.name?.trim() ||
        authData.user.email ||
        "Usuário";

      setDisplayName(dn);
      setUserSlug((profile as any)?.slug || null);
      setLoading(false);
    }

    loadUser();
  }, [router, supabase]);

  // Load appointments + expenses for the same period
  useEffect(() => {
    async function loadData() {
      setFetching(true);

      const from = startOfPeriod(period);
      const to = startOfToday();

      // 1) Appointments
      const { data: apptData, error: apptError } = await supabase
        .from("appointments")
        .select(
          `
          id,
          starts_at,
          client_phone,
          price_cents,
          paid_cents,
          discount_cents,
          payment_method,
          status,
          services:service_id ( name )
        `
        )
        .gte("starts_at", from.toISOString())
        .lte("starts_at", endOfTodayInclusiveIso())
        .order("starts_at", { ascending: true });

      if (!apptError && apptData) {
        const normalized = (apptData as any[]).map((r) => ({
          ...r,
          services: Array.isArray(r.services) ? r.services?.[0] ?? null : r.services ?? null,
        })) as AppointmentRow[];
        setRows(normalized);
      } else {
        setRows([]);
      }

      // 2) Expenses (date is DATE, so filter by YYYY-MM-DD)
      const { data: expData, error: expError } = await supabase
        .from("expenses")
        .select("id, description, category, amount_cents, date, recurring")
        .gte("date", ymd(from))
        .lte("date", ymd(to))
        .order("date", { ascending: false });

      setExpenses(expError || !expData ? [] : (expData as ExpenseRow[]));

      setFetching(false);
    }

    if (!loading) loadData();
  }, [period, loading, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const initialLetter = displayName?.trim().charAt(0).toUpperCase() ?? "M";

  const computed = useMemo(() => {
    const from = startOfPeriod(period);
    const to = startOfToday();
    const days = daysInRange(from, to);

    let previsto = 0;
    let pago = 0;

    // custos no período
    const custos = expenses.reduce((acc, e) => acc + (e.amount_cents ?? 0), 0);

    const byDay: Record<string, { previsto: number; pago: number }> = {};
    for (const d of days) byDay[ymd(d)] = { previsto: 0, pago: 0 };

    const serviceAgg: Record<string, { name: string; qtd: number; pago: number; previsto: number }> =
      {};

    // Retenção simples: clientes (phone) com 2+ atendimentos no período
    const clientsCount: Record<string, number> = {};

    for (const r of rows) {
      const price = r.price_cents ?? 0;
      const discount = r.discount_cents ?? 0;
      const paid = r.paid_cents ?? 0;

      const previstoRow = Math.max(price - discount, 0);
      const pagoRow = Math.max(paid, 0);

      previsto += previstoRow;
      pago += pagoRow;

      const dateKey = ymd(new Date(r.starts_at));
      if (byDay[dateKey]) {
        byDay[dateKey].previsto += previstoRow;
        byDay[dateKey].pago += pagoRow;
      }

      const serviceName = r.services?.name ?? "Sem serviço";
      if (!serviceAgg[serviceName]) {
        serviceAgg[serviceName] = { name: serviceName, qtd: 0, pago: 0, previsto: 0 };
      }
      serviceAgg[serviceName].qtd += 1;
      serviceAgg[serviceName].pago += pagoRow;
      serviceAgg[serviceName].previsto += previstoRow;

      const phone = (r.client_phone ?? "").trim();
      if (phone) clientsCount[phone] = (clientsCount[phone] ?? 0) + 1;
    }

    const areceber = Math.max(previsto - pago, 0);

    const series = days.map((d) => {
      const k = ymd(d);
      const item = byDay[k] ?? { previsto: 0, pago: 0 };
      const a = Math.max(item.previsto - item.pago, 0);
      return { label: niceDayLabel(d), previsto: item.previsto, pago: item.pago, areceber: a };
    });

    const ranking = Object.values(serviceAgg)
      .sort((a, b) => {
        if (rankMode === "qtd") return b.qtd - a.qtd;
        return b.pago - a.pago;
      })
      .slice(0, 6);

    const latest = [...rows]
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
      .slice(0, 8);

    const lucro = pago - custos;
    const ticketMedio = rows.length > 0 ? Math.floor(pago / rows.length) : 0;

    const totalClientes = Object.keys(clientsCount).length;
    const clientesRetornando = Object.values(clientsCount).filter((n) => n >= 2).length;
    const retencaoPct = totalClientes > 0 ? Math.round((clientesRetornando / totalClientes) * 100) : 0;

    return {
      previsto,
      pago,
      areceber,
      custos,
      lucro,
      ticketMedio,
      retencaoPct,
      series,
      ranking,
      latest,
    };
  }, [rows, period, rankMode, expenses]);

  const displayedSeries = useMemo(() => {
    return computed.series.map((p) => ({
      label: p.label,
      value: metric === "previsto" ? p.previsto : metric === "pago" ? p.pago : p.areceber,
    }));
  }, [computed.series, metric]);

  async function handleExportCsv() {
    try {
      setExporting(true);

      const from = startOfPeriod(period);
      const to = startOfToday();
      const filename = `marcai_export_${period}_${ymd(from)}_ate_${ymd(to)}.csv`;

      const header = [
        "Data",
        "Serviço",
        "Status",
        "FormaPagamento",
        "PreçoCentavos",
        "DescontoCentavos",
        "PrevistoCentavos",
        "PagoCentavos",
        "AReceberCentavos",
        "PrevistoBRL",
        "PagoBRL",
        "AReceberBRL",
      ];

      const lines = rows
        .slice()
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .map((r) => {
          const price = r.price_cents ?? 0;
          const discount = r.discount_cents ?? 0;
          const previsto = Math.max(price - discount, 0);
          const pago = r.paid_cents ?? 0;
          const areceber = Math.max(previsto - pago, 0);

          const dt = new Date(r.starts_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          const row = [
            dt,
            r.services?.name ?? "Sem serviço",
            r.status ?? "",
            r.payment_method ?? "",
            String(price),
            String(discount),
            String(previsto),
            String(pago),
            String(areceber),
            formatBRLFromCents(previsto),
            formatBRLFromCents(pago),
            formatBRLFromCents(areceber),
          ];

          return row.map((c) => csvEscape(String(c))).join(";");
        });

      const csv = [header.join(";"), ...lines].join("\n");
      downloadTextFile(filename, csv);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Carregando sua dashboard…</p>
      </main>
    );
  }

  const publicUrl = userSlug
    ? `${process.env.NEXT_PUBLIC_SITE_URL || "https://marcai.com.br"}/agenda/${userSlug}`
    : "#";

  return (
    <main className="min-h-screen bg-[#F6F7FB] flex">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-slate-200 px-5 py-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-semibold text-lg">
            M
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900">Marcaí</p>
            <p className="text-[11px] text-slate-500">Painel do profissional</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <button className={navButton(true)} onClick={() => router.push("/app")}>
            <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
            Dashboard
          </button>
          <button className={navButton(false)} onClick={() => router.push("/app/agendamentos")}>
            <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />
            Agendamentos
          </button>
          <button className={navButton(false)} onClick={() => router.push("/app/services")}>
            <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />
            Serviços
          </button>
          <button className={navButton(false)} onClick={() => router.push("/app/financeiro")}>
            <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />
            Financeiro
          </button>
          <button className={navButton(false)} onClick={() => router.push("/app/relatorios")}>
            <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />
            Relatórios
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
              {initialLetter}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-900 truncate max-w-[140px]">
                {displayName}
              </span>
              <span className="text-[11px] text-slate-500">Conta profissional</span>
            </div>
          </div>
          <button onClick={handleLogout} className="text-[11px] text-slate-500 hover:text-red-600 transition">
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
            aria-label="Abrir menu"
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold text-slate-900">Dashboard</p>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-xs"
            aria-label="Sair"
            type="button"
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
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                  M
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Marcaí</p>
                  <p className="text-[11px] text-slate-500">Painel do profissional</p>
                </div>
              </div>
              <button
                className="w-10 h-10 rounded-xl border border-slate-200"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar"
                type="button"
              >
                ✕
              </button>
            </div>

            <nav className="space-y-1">
              <button className={navButton(true)} onClick={() => { setMobileMenuOpen(false); router.push("/app"); }}>
                Dashboard
              </button>
              <button className={navButton(false)} onClick={() => { setMobileMenuOpen(false); router.push("/app/agendamentos"); }}>
                Agendamentos
              </button>
              <button className={navButton(false)} onClick={() => { setMobileMenuOpen(false); router.push("/app/services"); }}>
                Serviços
              </button>
              <button className={navButton(false)} onClick={() => { setMobileMenuOpen(false); router.push("/app/financeiro"); }}>
                Financeiro
              </button>
              <button className={navButton(false)} onClick={() => { setMobileMenuOpen(false); router.push("/app/relatorios"); }}>
                Relatórios
              </button>
            </nav>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                  {initialLetter}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-500">Conta profissional</p>
                </div>
              </div>
              <button onClick={handleLogout} className="text-[11px] text-slate-500 hover:text-red-600">
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
          transition={{ duration: 0.25 }}
        >
          {/* Link público */}
          {userSlug && hasMounted && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Link de agendamento</h3>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                  Compartilhe com seus clientes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-800 overflow-x-auto">
                  <span className="whitespace-nowrap">{publicUrl}</span>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(publicUrl).then(() => alert("Link copiado!"))}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                >
                  Copiar
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Seus clientes acessam este link e agendam diretamente na sua agenda.
              </p>
            </div>
          )}

          {/* Período */}
          <div className="flex items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Período:</span>
              <div className="flex rounded-full border border-slate-200 bg-white p-1">
                <button
                  onClick={() => setPeriod("week")}
                  className={`px-3 py-1.5 text-xs rounded-full ${
                    period === "week" ? "bg-blue-600 text-white" : "text-slate-600"
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setPeriod("month")}
                  className={`px-3 py-1.5 text-xs rounded-full ${
                    period === "month" ? "bg-blue-600 text-white" : "text-slate-600"
                  }`}
                >
                  Mês
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={exporting || fetching}
                onClick={handleExportCsv}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {exporting ? "Exportando..." : "Exportar CSV"}
              </button>
              <button
                onClick={() => router.push("/app/financeiro")}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                Ir para Financeiro
              </button>
            </div>
          </div>

          {/* KPIs (inclui custos/lucro/ticket/retencao) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard title="Pago" value={formatBRLFromCents(computed.pago)} hint="soma de paid_cents" loading={fetching} />
            <KpiCard title="Custos" value={formatBRLFromCents(computed.custos)} hint="despesas do período" loading={fetching} />
            <KpiCard title="Lucro" value={formatBRLFromCents(computed.lucro)} hint="pago - custos" loading={fetching} />
            <KpiCard title="Ticket médio" value={formatBRLFromCents(computed.ticketMedio)} hint={`retenção: ${computed.retencaoPct}%`} loading={fetching} />
          </div>

          {/* Previsto/Pago/A receber + Atendimentos (mantidos) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard title="Previsto" value={formatBRLFromCents(computed.previsto)} hint="(preço - desconto)" loading={fetching} />
            <KpiCard title="Pago (no mês)" value={formatBRLFromCents(computed.pago)} hint="entradas" loading={fetching} />
            <KpiCard title="A receber" value={formatBRLFromCents(computed.areceber)} hint="previsto - pago" loading={fetching} />
            <KpiCard title="Atendimentos" value={String(rows.length)} hint="no período" loading={fetching} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* CHART */}
            <div className="xl:col-span-2 rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Previsto × Pago</p>
                  <p className="text-xs text-slate-500">Troque a métrica para ver o gráfico.</p>
                </div>

                <div className="flex rounded-full border border-slate-200 bg-white p-1">
                  <button
                    onClick={() => setMetric("previsto")}
                    className={`px-3 py-1.5 text-xs rounded-full ${
                      metric === "previsto" ? "bg-blue-600 text-white" : "text-slate-600"
                    }`}
                  >
                    Previsto
                  </button>
                  <button
                    onClick={() => setMetric("pago")}
                    className={`px-3 py-1.5 text-xs rounded-full ${
                      metric === "pago" ? "bg-blue-600 text-white" : "text-slate-600"
                    }`}
                  >
                    Pago
                  </button>
                  <button
                    onClick={() => setMetric("areceber")}
                    className={`px-3 py-1.5 text-xs rounded-full ${
                      metric === "areceber" ? "bg-blue-600 text-white" : "text-slate-600"
                    }`}
                  >
                    A receber
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <MiniLineChart points={displayedSeries} />
                <p className="mt-2 text-[11px] text-slate-500">
                  * Valores no gráfico estão em reais (aprox.). Exportações usam centavos.
                </p>
              </div>
            </div>

            {/* RANKING */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Ranking de serviços</p>
                  <p className="text-xs text-slate-500">Top do período</p>
                </div>

                <div className="flex rounded-full border border-slate-200 bg-white p-1">
                  <button
                    onClick={() => setRankMode("qtd")}
                    className={`px-3 py-1.5 text-xs rounded-full ${
                      rankMode === "qtd" ? "bg-blue-600 text-white" : "text-slate-600"
                    }`}
                  >
                    Qtd
                  </button>
                  <button
                    onClick={() => setRankMode("receita")}
                    className={`px-3 py-1.5 text-xs rounded-full ${
                      rankMode === "receita" ? "bg-blue-600 text-white" : "text-slate-600"
                    }`}
                  >
                    Receita
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {computed.ranking.length === 0 ? (
                  <p className="text-sm text-slate-600">Sem atendimentos no período.</p>
                ) : (
                  computed.ranking.map((s) => (
                    <div key={s.name} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                        <p className="text-[11px] text-slate-500">{s.qtd} atendimentos</p>
                      </div>

                      <div className="text-right">
                        {rankMode === "qtd" ? (
                          <p className="text-sm font-semibold text-slate-900">{s.qtd}</p>
                        ) : (
                          <p className="text-sm font-semibold text-slate-900">
                            {formatBRLFromCents(s.pago)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 rounded-2xl bg-blue-50 border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-1">💡 Dica financeira</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Registre custos (aluguel, insumos, taxas, anúncios) para ver o resultado real do mês.
                </p>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Últimos atendimentos</p>
              <p className="text-xs text-slate-500">{rows.length} no período</p>
            </div>

            <div className="mt-4 overflow-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="text-xs text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2 pr-4">Data</th>
                    <th className="text-left py-2 pr-4">Serviço</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-right py-2 pr-4">Previsto</th>
                    <th className="text-right py-2 pr-4">Pago</th>
                    <th className="text-right py-2">A receber</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.latest.length === 0 ? (
                    <tr>
                      <td className="py-4 text-slate-600" colSpan={6}>
                        Sem atendimentos no período.
                      </td>
                    </tr>
                  ) : (
                    computed.latest.map((r) => {
                      const price = r.price_cents ?? 0;
                      const discount = r.discount_cents ?? 0;
                      const previsto = Math.max(price - discount, 0);
                      const pago = r.paid_cents ?? 0;
                      const areceber = Math.max(previsto - pago, 0);

                      return (
                        <tr key={r.id} className="border-b border-slate-100">
                          <td className="py-3 pr-4 text-slate-700">
                            {new Date(r.starts_at).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 pr-4 text-slate-900 font-medium">{r.services?.name ?? "Sem serviço"}</td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-slate-200 bg-slate-50 text-slate-700">
                              {r.status ?? "—"}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right text-slate-900">{formatBRLFromCents(previsto)}</td>
                          <td className="py-3 pr-4 text-right text-slate-900">{formatBRLFromCents(pago)}</td>
                          <td className="py-3 text-right text-slate-900">{formatBRLFromCents(areceber)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

// ===== Components =====
function KpiCard(props: { title: string; value: string; hint: string; loading?: boolean }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
      <p className="text-xs text-slate-500">{props.title}</p>
      <div className="mt-2">
        <p className="text-2xl font-semibold text-slate-900">{props.loading ? "—" : props.value}</p>
        <p className="text-xs text-slate-500 mt-1">{props.hint}</p>
      </div>
    </div>
  );
}

function MiniLineChart(props: { points: { label: string; value: number }[] }) {
  const w = 900;
  const h = 260;
  const pad = 32;

  const max = Math.max(1, ...props.points.map((p) => p.value));
  const min = 0;

  const pts = props.points.map((p, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, props.points.length - 1);
    const y = h - pad - ((p.value - min) * (h - pad * 2)) / Math.max(1, max - min);
    return { x, y, ...p };
  });

  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  return (
    <div className="w-full overflow-auto">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="rounded-xl border border-slate-200 bg-white">
        {Array.from({ length: 5 }).map((_, i) => {
          const y = pad + (i * (h - pad * 2)) / 4;
          return <line key={i} x1={pad} x2={w - pad} y1={y} y2={y} stroke="#E5E7EB" strokeDasharray="4 4" />;
        })}
        <line x1={pad} x2={pad} y1={pad} y2={h - pad} stroke="#CBD5E1" />
        <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="#CBD5E1" />
        <path d={d} fill="none" stroke="#2563EB" strokeWidth="3" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#2563EB" />)}
        {pts.map((p, i) => (
          <text key={i} x={p.x} y={h - 10} textAnchor="middle" fontSize="11" fill="#64748B">
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
