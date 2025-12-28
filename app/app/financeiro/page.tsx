"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

/* =======================
   TIPOS
======================= */
type ExpenseRow = {
  id: string;
  user_id: string;
  description: string | null;
  category: string | null;
  amount_cents: number;
  date: string;
  recurring: boolean | null;
  created_at: string;
};

type AppointmentRow = {
  id: string;
  starts_at: string;
  price_cents: number | null;
  discount_cents: number | null;
  paid_cents: number | null;
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

function navButton(active: boolean) {
  return `w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition ${
    active
      ? "bg-slate-100 text-slate-900 font-medium"
      : "text-slate-600 hover:bg-slate-50"
  }`;
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function centsFromBRL(input: string) {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/* =======================
   PAGE
======================= */
export default function FinanceiroPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [userName, setUserName] = useState("Usuário");
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);

  // form
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(ymd(new Date()));
  const [recurring, setRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const initialLetter = userName.charAt(0).toUpperCase();

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

      const from = `${selectedMonth}-01`;
      const to = `${selectedMonth}-31`;

      const { data: exp } = await supabase
        .from("expenses")
        .select("*")
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false });

      const { data: appt } = await supabase
        .from("appointments")
        .select("starts_at, price_cents, discount_cents, paid_cents")
        .gte("starts_at", `${from}T00:00:00`)
        .lte("starts_at", `${to}T23:59:59`);

      setExpenses((exp ?? []) as ExpenseRow[]);
      setAppointments((appt ?? []) as AppointmentRow[]);
      setLoading(false);
    }

    load();
  }, [router, supabase, selectedMonth]);

  /* =======================
     CALCULOS
  ======================= */
  const computed = useMemo(() => {
    let previsto = 0;
    let pago = 0;

    for (const a of appointments) {
      const total = Math.max((a.price_cents ?? 0) - (a.discount_cents ?? 0), 0);
      previsto += total;
      pago += a.paid_cents ?? 0;
    }

    const custos = expenses.reduce((acc, e) => acc + e.amount_cents, 0);

    return {
      previsto,
      pago,
      custos,
      lucro: pago - custos,
    };
  }, [appointments, expenses]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleCreateExpense(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    const cents = centsFromBRL(amount);
    if (!desc || !cents || cents <= 0) {
      setErr("Preencha descrição e valor válido.");
      return;
    }

    setSaving(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: auth.user.id,
        description: desc,
        category: category || null,
        amount_cents: cents,
        date,
        recurring,
      })
      .select("*")
      .single();

    if (!error && data) {
      setExpenses((prev) => [data as ExpenseRow, ...prev]);
      setDesc("");
      setCategory("");
      setAmount("");
      setRecurring(false);
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <p className="text-sm text-slate-500">Carregando financeiro…</p>
      </main>
    );
  }

  /* =======================
     UI
  ======================= */
  return (
    <main className="min-h-screen bg-[#F6F7FB] flex">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-slate-200 px-5 py-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-semibold">
            M
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Marcaí</p>
            <p className="text-[11px] text-slate-500">Painel do profissional</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <button className={navButton(false)} onClick={() => router.push("/app")}>Dashboard</button>
          <button className={navButton(false)} onClick={() => router.push("/app/agendamentos")}>Agendamentos</button>
          <button className={navButton(false)} onClick={() => router.push("/app/services")}>Serviços</button>
          <button className={navButton(true)}>Financeiro</button>
          <button className={navButton(false)} onClick={() => router.push("/app/relatorios")}>Relatórios</button>
        </nav>

        <div className="pt-4 border-t border-slate-200 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
            {initialLetter}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{userName}</p>
            <p className="text-[11px] text-slate-500">Conta profissional</p>
          </div>
          <button onClick={handleLogout} className="ml-auto text-[11px] text-slate-500 hover:text-red-600">
            Sair
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 bg-[#F6F7FB] border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 rounded-xl border border-slate-200 bg-white"
          >
            ☰
          </button>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-semibold">
              M
            </div>
            <span className="text-sm font-semibold text-slate-900">Financeiro</span>
          </div>

          <button onClick={handleLogout} className="text-xs text-slate-600">
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
          <aside className="absolute left-0 top-0 h-full w-[280px] bg-white border-r border-slate-200 px-5 py-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-semibold">
                M
              </div>
              <span className="text-sm font-semibold text-slate-900">Marcaí</span>
            </div>

            <nav className="space-y-1">
              <button className={navButton(false)} onClick={() => router.push("/app")}>Dashboard</button>
              <button className={navButton(false)} onClick={() => router.push("/app/agendamentos")}>Agendamentos</button>
              <button className={navButton(false)} onClick={() => router.push("/app/services")}>Serviços</button>
              <button className={navButton(true)}>Financeiro</button>
              <button className={navButton(false)} onClick={() => router.push("/app/relatorios")}>Relatórios</button>
            </nav>
          </aside>
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 min-w-0">
        <div className="lg:hidden h-[72px]" />

        <motion.section
          className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <header>
            <h1 className="text-2xl font-semibold text-slate-900">Financeiro</h1>
            <p className="text-sm text-slate-600">Resumo do mês</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi title="Previsto" value={brl(computed.previsto)} />
            <Kpi title="Pago" value={brl(computed.pago)} />
            <Kpi title="Custos" value={brl(computed.custos)} />
            <Kpi title="Resultado" value={brl(computed.lucro)} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="font-semibold text-sm mb-3">Adicionar custo</p>

              <form onSubmit={handleCreateExpense} className="space-y-3">
                <input className="w-full border rounded-xl px-3 py-2" placeholder="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} />
                <input className="w-full border rounded-xl px-3 py-2" placeholder="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} />
                <input className="w-full border rounded-xl px-3 py-2" placeholder="Valor (ex: 120,00)" value={amount} onChange={(e) => setAmount(e.target.value)} />

                <button disabled={saving} className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm">
                  {saving ? "Salvando..." : "Salvar custo"}
                </button>

                {err && <p className="text-xs text-red-600">{err}</p>}
              </form>
            </div>

            <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-sm font-semibold mb-3">Custos do mês</p>

              {expenses.length === 0 ? (
                <p className="text-sm text-slate-600">Nenhum custo registrado neste mês.</p>
              ) : (
                <div className="space-y-3">
                  {expenses.map((e) => (
                    <div key={e.id} className="flex justify-between items-center border border-slate-200 rounded-xl p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{e.description}</p>
                        <p className="text-xs text-slate-500">
                          {e.date} • {e.category || "Sem categoria"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {brl(e.amount_cents)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-2">{value}</p>
    </div>
  );
}
