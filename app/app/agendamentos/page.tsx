"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type AppointmentRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  client_name: string | null;
  client_phone: string | null;

  price_cents: number | null;
  discount_cents: number | null;
  paid_cents: number | null;
  paid_at: string | null;
  payment_method: string | null;
  status: string | null;

  services?: { name: string } | null;
};

function formatBRLFromCents(cents: number) {
  const value = cents / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function centsFromBRLInput(input: string) {
  // aceita "50", "50,00", "50.00", "R$ 50,00"
  const cleaned = input
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function statusBadge(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "paid") return "bg-emerald-50 border-emerald-200 text-emerald-700";
  if (s === "partial") return "bg-amber-50 border-amber-200 text-amber-700";
  if (s === "canceled") return "bg-slate-50 border-slate-200 text-slate-600";
  return "bg-blue-50 border-blue-200 text-blue-700";
}

function statusLabel(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "paid") return "pago";
  if (s === "partial") return "parcial";
  if (s === "canceled") return "cancelado";
  return status ?? "scheduled";
}

function navButton(active: boolean) {
  return `w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition ${
    active ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
  }`;
}

export default function AppAgendamentosPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("Usuário");

  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [fetching, setFetching] = useState(false);

  // modal
  const [payOpen, setPayOpen] = useState(false);
  const [payRow, setPayRow] = useState<AppointmentRow | null>(null);
  const [payValue, setPayValue] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("pix");
  const [savingPay, setSavingPay] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    async function loadAppointments() {
      setFetching(true);
      setErr(null);

      // janela simples: últimos 60 dias até próximos 60 dias
      const from = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const to = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          id,
          starts_at,
          ends_at,
          client_name,
          client_phone,
          price_cents,
          discount_cents,
          paid_cents,
          paid_at,
          payment_method,
          status,
          services:service_id ( name )
        `
        )
        .gte("starts_at", from.toISOString())
        .lte("starts_at", to.toISOString())
        .order("starts_at", { ascending: true });

      if (error) {
        setRows([]);
        setErr("Não consegui carregar seus agendamentos (verifique RLS).");
      } else {
        const normalized = ((data ?? []) as any[]).map((r) => ({
          ...r,
          services: Array.isArray(r.services) ? r.services?.[0] ?? null : r.services ?? null,
        })) as AppointmentRow[];

        setRows(normalized);
      }

      setFetching(false);
    }

    if (!loading) loadAppointments();
  }, [loading, supabase]);

  function openPayModal(row: AppointmentRow) {
    setErr(null);
    setPayRow(row);

    // sugestão: falta para quitar
    const price = row.price_cents ?? 0;
    const discount = row.discount_cents ?? 0;
    const total = Math.max(price - discount, 0);
    const paid = row.paid_cents ?? 0;
    const remaining = Math.max(total - paid, 0);

    setPayValue(remaining > 0 ? String((remaining / 100).toFixed(2)).replace(".", ",") : "");
    setPayMethod(row.payment_method ?? "pix");
    setPayOpen(true);
  }

  function closePayModal() {
    if (savingPay) return;
    setPayOpen(false);
    setPayRow(null);
    setPayValue("");
    setPayMethod("pix");
  }

  async function handleSavePayment() {
    if (!payRow) return;

    setSavingPay(true);
    setErr(null);

    const addCents = centsFromBRLInput(payValue);
    if (addCents === null) {
      setErr("Informe um valor válido.");
      setSavingPay(false);
      return;
    }

    // 1) pega valores atuais do banco (evita conflito / garante cálculo certo)
    const { data: fresh, error: freshErr } = await supabase
      .from("appointments")
      .select("price_cents, discount_cents, paid_cents")
      .eq("id", payRow.id)
      .single();

    if (freshErr || !fresh) {
      setErr("Não consegui ler o agendamento para calcular o pagamento.");
      setSavingPay(false);
      return;
    }

    const price = fresh.price_cents ?? 0;
    const discount = fresh.discount_cents ?? 0;
    const total = Math.max(price - discount, 0);

    const currentPaid = fresh.paid_cents ?? 0;
    const nextPaid = clamp(currentPaid + addCents, 0, total);

    const nextStatus = nextPaid >= total ? "paid" : nextPaid > 0 ? "partial" : "scheduled";

    const updatePayload: Record<string, any> = {
      paid_cents: nextPaid,
      payment_method: payMethod,
      status: nextStatus,
      paid_at: nextPaid > 0 ? new Date().toISOString() : null,
    };

    const { error: updErr } = await supabase.from("appointments").update(updatePayload).eq("id", payRow.id);

    if (updErr) {
      console.error("[payment update] error:", updErr);
      setErr("Não foi possível salvar (verifique RLS).");
      setSavingPay(false);
      return;
    }

    // 2) reflete na UI sem precisar recarregar
    setRows((prev) =>
      prev.map((r) => (r.id === payRow.id ? ({ ...r, ...updatePayload } as AppointmentRow) : r))
    );

    setSavingPay(false);
    closePayModal();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Carregando…</p>
      </main>
    );
  }

  const initialLetter = userName.trim().charAt(0).toUpperCase() ?? "M";

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
          <button className={navButton(false)} onClick={() => router.push("/app")}>
            <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />
            Dashboard
          </button>
          <button className={navButton(true)} onClick={() => router.push("/app/agendamentos")}>
            <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
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
              <span className="text-xs font-medium text-slate-900 truncate max-w-[140px]">{userName}</span>
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
            <p className="text-sm font-semibold text-slate-900">Agendamentos</p>
            <p className="text-[11px] text-slate-500">Registre pagamentos</p>
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
                className={navButton(true)}
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

                            <button
                className={navButton(false)}
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
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
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
        {/* spacer do header mobile */}
        <div className="lg:hidden h-[73px]" />

        <motion.section
          className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Agendamentos</p>
                <p className="text-xs text-slate-500">Registre pagamentos parciais ou totais.</p>
              </div>

              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                {fetching ? "Atualizando…" : `${rows.length} itens`}
              </span>
            </div>

            {err && <p className="text-xs text-red-600 mt-3">{err}</p>}
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 overflow-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="text-left py-2 pr-4">Data</th>
                  <th className="text-left py-2 pr-4">Serviço</th>
                  <th className="text-left py-2 pr-4">Cliente</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-right py-2 pr-4">Previsto</th>
                  <th className="text-right py-2 pr-4">Pago</th>
                  <th className="text-right py-2 pr-4">A receber</th>
                  <th className="text-right py-2">Ações</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="py-4 text-slate-600" colSpan={8}>
                      Nenhum agendamento encontrado no período.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const price = r.price_cents ?? 0;
                    const discount = r.discount_cents ?? 0;
                    const total = Math.max(price - discount, 0);
                    const paid = r.paid_cents ?? 0;
                    const remaining = Math.max(total - paid, 0);

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
                          <div className="min-w-0">
                            <p className="text-slate-900 truncate max-w-[240px]">{r.client_name ?? "—"}</p>
                            <p className="text-[11px] text-slate-500">{r.client_phone ?? "—"}</p>
                          </div>
                        </td>

                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${statusBadge(r.status)}`}>
                            {statusLabel(r.status)}
                          </span>
                        </td>

                        <td className="py-3 pr-4 text-right text-slate-900">{formatBRLFromCents(total)}</td>
                        <td className="py-3 pr-4 text-right text-slate-900">{formatBRLFromCents(paid)}</td>
                        <td className="py-3 pr-4 text-right text-slate-900">{formatBRLFromCents(remaining)}</td>

                        <td className="py-3 text-right">
                          <button
                            onClick={() => openPayModal(r)}
                            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition"
                          >
                            Registrar pagamento
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.section>
      </div>

      {/* MODAL PAGAMENTO */}
      {payOpen && payRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closePayModal} />

          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Registrar pagamento</p>
                <p className="text-xs text-slate-500 mt-1">
                  {payRow.services?.name ?? "Sem serviço"} •{" "}
                  {new Date(payRow.starts_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <button
                onClick={closePayModal}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white"
                aria-label="Fechar"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Valor pago (R$)</label>
                <input
                  className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-200 outline-none"
                  value={payValue}
                  onChange={(e) => setPayValue(e.target.value)}
                  placeholder="Ex: 50,00"
                  inputMode="decimal"
                />
                <p className="text-[11px] text-slate-500 mt-2">Pode registrar parcial. O sistema soma e limita no total.</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Forma de pagamento</label>
                <select
                  className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-200 outline-none"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão</option>
                  <option value="transferencia">Transferência</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            {err && <p className="text-xs text-red-600 mt-3">{err}</p>}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closePayModal}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition"
                disabled={savingPay}
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePayment}
                className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                disabled={savingPay}
              >
                {savingPay ? "Salvando..." : "Salvar pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
