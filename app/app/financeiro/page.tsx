// app/app/financeiro/page.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Period = "month";

type ExpenseRow = {
  id: string;
  user_id: string;
  description: string | null;
  category: string | null;
  amount_cents: number;
  date: string; // YYYY-MM-DD  ✅ (não é expense_date)
  recurring: boolean | null;
  created_at: string;
};

type AppointmentRow = {
  id: string;
  starts_at: string;
  price_cents: number | null;
  discount_cents: number | null;
  paid_cents: number | null;
  status: string | null;
  services?: { name: string } | null;
};

function formatBRLFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
}

function firstDayOfMonth(month: string) {
  // month: YYYY-MM
  return `${month}-01`;
}

function lastDayOfMonth(month: string) {
  const [y, m] = month.split("-").map((n) => Number(n));
  const last = new Date(y, (m ?? 1) - 1 + 1, 0);
  return ymd(last);
}

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

function centsFromBRLInput(input: string) {
  // aceita "50", "50,00", "50.00", "R$ 50,00"
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function navButton(active: boolean) {
  return `w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition ${
    active ? "bg-slate-100 text-slate-900 font-medium" : "text-slate-700 hover:bg-slate-50"
  }`;
}

export default function FinanceiroPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [userName, setUserName] = useState<string>("Usuário");
  const initialLetter = userName.trim().charAt(0).toUpperCase() ?? "M";

  // filtros
  const [period] = useState<Period>("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => monthKey(new Date()));
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // dados
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);

  // form (criar)
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => ymd(new Date()));
  const [amount, setAmount] = useState(""); // BRL
  const [recurring, setRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // modal editar
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<ExpenseRow | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editRecurring, setEditRecurring] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        .select("name")
        .eq("id", userId)
        .maybeSingle();

      setUserName(profile?.name ?? authData.user.email ?? "Usuário");
      setLoading(false);
    }

    loadUser();
  }, [router, supabase]);

  useEffect(() => {
    async function loadMonthData() {
      setFetching(true);
      setErr(null);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setFetching(false);
        router.push("/auth/login");
        return;
      }
      const userId = authData.user.id;

      const from = firstDayOfMonth(selectedMonth);
      const to = lastDayOfMonth(selectedMonth);

      // 1) expenses (✅ coluna é "date")
      const expQuery = supabase
        .from("expenses")
        .select("id, user_id, description, category, amount_cents, date, recurring, created_at")
        .eq("user_id", userId)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false });

      const { data: expData, error: expErr } = await expQuery;
      if (expErr) {
        console.error("[financeiro load expenses] error", expErr);
        setErr("Não consegui carregar os custos (verifique a tabela/RLS).");
        setExpenses([]);
      } else {
        setExpenses((expData ?? []) as ExpenseRow[]);
      }

      // 2) appointments do mês (pra métricas)
      const apptQuery = supabase
        .from("appointments")
        .select(
          `
          id,
          starts_at,
          price_cents,
          discount_cents,
          paid_cents,
          status,
          services:service_id ( name )
        `
        )
        .gte("starts_at", new Date(`${from}T00:00:00`).toISOString())
        .lte("starts_at", new Date(`${to}T23:59:59`).toISOString())
        .order("starts_at", { ascending: true });

      const { data: apptData, error: apptErr } = await apptQuery;
      if (apptErr) {
        console.error("[financeiro load appointments] error", apptErr);
        setAppointments([]);
      } else {
        const normalized = ((apptData ?? []) as any[]).map((r) => ({
          ...r,
          services: Array.isArray(r.services) ? r.services?.[0] ?? null : r.services ?? null,
        })) as AppointmentRow[];
        setAppointments(normalized);
      }

      setFetching(false);
    }

    if (!loading) loadMonthData();
  }, [loading, selectedMonth, supabase, router]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const e of expenses) {
      const c = (e.category ?? "").trim();
      if (c) set.add(c);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (categoryFilter === "all") return expenses;
    return expenses.filter((e) => (e.category ?? "").trim() === categoryFilter);
  }, [expenses, categoryFilter]);

  const computed = useMemo(() => {
    // receita prevista = sum(max(price-discount,0))
    // receita paga = sum(paid_cents)
    // custos = sum(amount_cents)
    let receitaPrevista = 0;
    let receitaPaga = 0;
    let qtd = 0;

    for (const a of appointments) {
      const price = a.price_cents ?? 0;
      const discount = a.discount_cents ?? 0;
      const previsto = Math.max(price - discount, 0);
      receitaPrevista += previsto;

      const paid = a.paid_cents ?? 0;
      receitaPaga += Math.max(paid, 0);

      qtd += 1;
    }

    const custos = filteredExpenses.reduce((acc, e) => acc + (e.amount_cents ?? 0), 0);
    const lucroPeloPago = receitaPaga - custos;
    const ticketMedio = qtd > 0 ? Math.round(receitaPaga / qtd) : 0;
    const aReceber = Math.max(receitaPrevista - receitaPaga, 0);

    return { receitaPrevista, receitaPaga, aReceber, custos, lucroPeloPago, ticketMedio, qtd };
  }, [appointments, filteredExpenses]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleCreateExpense(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!desc.trim() || !amount.trim() || !date) {
      setErr("Preencha descrição, valor e data.");
      return;
    }

    const amountCents = centsFromBRLInput(amount);
    if (amountCents === null || amountCents <= 0) {
      setErr("Valor inválido. Ex: 120,00");
      return;
    }

    setSaving(true);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setSaving(false);
      router.push("/auth/login");
      return;
    }

    const payload = {
      user_id: authData.user.id,
      description: desc.trim(),
      category: category.trim() || null,
      amount_cents: amountCents,
      date, // ✅
      recurring,
    };

    const { data: inserted, error } = await supabase
      .from("expenses")
      .insert(payload)
      .select("id, user_id, description, category, amount_cents, date, recurring, created_at")
      .single();

    if (error) {
      console.error("[create expense] error", error);
      setErr("Não foi possível salvar (verifique RLS).");
      setSaving(false);
      return;
    }

    setExpenses((prev) => [inserted as ExpenseRow, ...prev]);
    setDesc("");
    setCategory("");
    setAmount("");
    setDate(ymd(new Date()));
    setRecurring(false);

    setSaving(false);
  }

  function openEdit(row: ExpenseRow) {
    setErr(null);
    setEditRow(row);
    setEditDesc(row.description ?? "");
    setEditCategory(row.category ?? "");
    setEditDate(row.date);
    setEditAmount(String((row.amount_cents / 100).toFixed(2)).replace(".", ","));
    setEditRecurring(Boolean(row.recurring));
    setEditOpen(true);
  }

  function closeEdit() {
    if (saving || deleting) return;
    setEditOpen(false);
    setEditRow(null);
  }

  async function handleUpdateExpense() {
    if (!editRow) return;
    setErr(null);

    if (!editDesc.trim() || !editAmount.trim() || !editDate) {
      setErr("Preencha descrição, valor e data.");
      return;
    }

    const amountCents = centsFromBRLInput(editAmount);
    if (amountCents === null || amountCents <= 0) {
      setErr("Valor inválido. Ex: 120,00");
      return;
    }

    setSaving(true);

    const payload = {
      description: editDesc.trim(),
      category: editCategory.trim() || null,
      amount_cents: amountCents,
      date: editDate, // ✅
      recurring: editRecurring,
    };

    const { data: updated, error } = await supabase
      .from("expenses")
      .update(payload)
      .eq("id", editRow.id)
      .select("id, user_id, description, category, amount_cents, date, recurring, created_at")
      .single();

    if (error) {
      console.error("[update expense] error", error);
      setErr("Não foi possível atualizar (verifique RLS).");
      setSaving(false);
      return;
    }

    setExpenses((prev) => prev.map((e) => (e.id === editRow.id ? (updated as ExpenseRow) : e)));
    setSaving(false);
    closeEdit();
  }

  async function handleDeleteExpense() {
    if (!editRow) return;

    setDeleting(true);
    setErr(null);

    const { error } = await supabase.from("expenses").delete().eq("id", editRow.id);

    if (error) {
      console.error("[delete expense] error", error);
      setErr("Não foi possível excluir (verifique RLS).");
      setDeleting(false);
      return;
    }

    setExpenses((prev) => prev.filter((e) => e.id !== editRow.id));
    setDeleting(false);
    closeEdit();
  }

  function handleExportCsv() {
    const filename = `marcai_custos_${selectedMonth}.csv`;

    const header = ["Data", "Descrição", "Categoria", "Recorrente", "ValorCentavos", "ValorBRL"];
    const lines = filteredExpenses
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((e) => {
        const row = [
          e.date,
          e.description ?? "",
          e.category ?? "",
          e.recurring ? "sim" : "nao",
          String(e.amount_cents ?? 0),
          formatBRLFromCents(e.amount_cents ?? 0),
        ];
        return row.map((c) => csvEscape(String(c))).join(";");
      });

    const csv = [header.join(";"), ...lines].join("\n");
    downloadTextFile(filename, csv);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Carregando…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F7FB] flex">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-slate-200 px-5 py-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-semibold text-lg">
            M
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900">Marcaí</p>
            <p className="text-[11px] text-slate-500">Painel do profissional</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <button className={navButton(false)} onClick={() => router.push("/app")}>
            <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />
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
          <button className={navButton(true)} onClick={() => router.push("/app/financeiro")}>
            <span className="inline-block w-2 h-2 rounded-full bg-slate-900" />
            Financeiro
          </button>
          <button className={navButton(false)} onClick={() => router.push("/app/relatorios")}>
            <span className="inline-block w-2 h-2 rounded-full bg-slate-900" />
            Relatórios
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
              {initialLetter}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-900 truncate max-w-[140px]">
                {userName}
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
            <p className="text-sm font-semibold text-slate-900">Financeiro</p>
            <p className="text-[11px] text-slate-500">Custos e resultado</p>
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
                <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-semibold text-lg">
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
                className={navButton(true)}
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/app/financeiro");
                }}
              >
                Financeiro
              </button>
                            <button
                className={navButton(true)}
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/app/relatorios");
                }}
              >
                Relatórios
              </button>
            </nav>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                  {initialLetter}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">{userName}</p>
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
          {/* HEADER */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Financeiro do mês</p>
                <p className="text-xs text-slate-500">
                  Receita (agendamentos) × custos (despesas) — resultado real do mês.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="month"
                  className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />

                <select
                  className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === "all" ? "Todas categorias" : c}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleExportCsv}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 hover:bg-slate-50 transition"
                >
                  Exportar custos (CSV)
                </button>
              </div>
            </div>

            {err && <p className="text-xs text-red-600 mt-3">{err}</p>}
            {fetching && <p className="text-xs text-slate-500 mt-3">Atualizando…</p>}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <KpiCard title="Receita prevista" value={formatBRLFromCents(computed.receitaPrevista)} hint="(preço - desconto)" />
            <KpiCard title="Receita paga" value={formatBRLFromCents(computed.receitaPaga)} hint="soma de paid_cents" />
            <KpiCard title="A receber" value={formatBRLFromCents(computed.aReceber)} hint="previsto - pago" />
            <KpiCard title="Custos (filtrados)" value={formatBRLFromCents(computed.custos)} hint="despesas do mês" />
            <KpiCard title="Resultado" value={formatBRLFromCents(computed.lucroPeloPago)} hint="pago - custos" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* FORM */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-slate-900">Adicionar custo</p>
              <p className="text-xs text-slate-500 mt-1">
                Ex: aluguel, insumos, taxas, anúncios.
              </p>

              <form onSubmit={handleCreateExpense} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Descrição</label>
                  <input
                    className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Ex: Aluguel, Shampoo, Ads..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Categoria</label>
                    <input
                      className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Ex: Aluguel"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700">Valor (R$)</label>
                    <input
                      className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Ex: 120,00"
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Data</label>
                    <input
                      type="date"
                      className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={recurring}
                        onChange={(e) => setRecurring(e.target.checked)}
                      />
                      Recorrente
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full mt-2 bg-slate-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar custo"}
                </button>
              </form>
            </div>

            {/* LIST */}
            <div className="xl:col-span-2 rounded-2xl bg-white border border-slate-200 shadow-sm p-5 overflow-auto">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Custos do mês</p>
                  <p className="text-xs text-slate-500">
                    {filteredExpenses.length} itens {categoryFilter !== "all" ? `(filtro: ${categoryFilter})` : ""}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">Ticket médio (pago)</p>
                  <p className="text-sm font-semibold text-slate-900">{formatBRLFromCents(computed.ticketMedio)}</p>
                </div>
              </div>

              <table className="min-w-[900px] w-full text-sm mt-4">
                <thead className="text-xs text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2 pr-4">Data</th>
                    <th className="text-left py-2 pr-4">Descrição</th>
                    <th className="text-left py-2 pr-4">Categoria</th>
                    <th className="text-left py-2 pr-4">Recorrente</th>
                    <th className="text-right py-2 pr-4">Valor</th>
                    <th className="text-right py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td className="py-4 text-slate-600" colSpan={6}>
                        Nenhum custo neste mês (com os filtros atuais).
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4 text-slate-700">{e.date}</td>
                        <td className="py-3 pr-4 text-slate-900 font-medium">{e.description ?? "—"}</td>
                        <td className="py-3 pr-4 text-slate-700">{e.category ?? "—"}</td>
                        <td className="py-3 pr-4 text-slate-700">{e.recurring ? "sim" : "não"}</td>
                        <td className="py-3 pr-4 text-right text-slate-900">
                          {formatBRLFromCents(e.amount_cents ?? 0)}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => openEdit(e)}
                            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>
      </div>

      {/* MODAL EDIT */}
      {editOpen && editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />

          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Editar custo</p>
                <p className="text-xs text-slate-500 mt-1">Atualize descrição, valor, data e recorrência.</p>
              </div>

              <button
                onClick={closeEdit}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white"
                aria-label="Fechar"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Descrição</label>
                <input
                  className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Categoria</label>
                  <input
                    className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">Valor (R$)</label>
                  <input
                    className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Data</label>
                  <input
                    type="date"
                    className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={editRecurring}
                      onChange={(e) => setEditRecurring(e.target.checked)}
                    />
                    Recorrente
                  </label>
                </div>
              </div>

              {err && <p className="text-xs text-red-600 mt-1">{err}</p>}

              <div className="mt-5 flex items-center justify-between gap-2">
                <button
                  onClick={handleDeleteExpense}
                  className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                  disabled={saving || deleting}
                >
                  {deleting ? "Excluindo..." : "Excluir"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={closeEdit}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition"
                    disabled={saving || deleting}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateExpense}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition disabled:opacity-50"
                    disabled={saving || deleting}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function KpiCard(props: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
      <p className="text-xs text-slate-500">{props.title}</p>
      <div className="mt-2">
        <p className="text-2xl font-semibold text-slate-900">{props.value}</p>
        <p className="text-xs text-slate-500 mt-1">{props.hint}</p>
      </div>
    </div>
  );
}
