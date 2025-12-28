"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

/* =======================
   TIPOS
======================= */
type AppointmentRow = {
  id: string;
  starts_at: string;
  client_name: string | null;
  client_phone: string | null;
  price_cents: number | null;
  discount_cents: number | null;
  paid_cents: number | null;
  payment_method: string | null;
  status: string | null;
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

function statusBadge(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "partial") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function statusLabel(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "paid") return "Pago";
  if (s === "partial") return "Parcial";
  return "Agendado";
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
export default function AgendamentosPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Usuário");
  const [rows, setRows] = useState<AppointmentRow[]>([]);

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
        .from("appointments")
        .select(`
          id,
          starts_at,
          client_name,
          client_phone,
          price_cents,
          discount_cents,
          paid_cents,
          payment_method,
          status,
          services:service_id ( name )
        `)
        .order("starts_at", { ascending: true });

      const normalized = ((data ?? []) as any[]).map((r) => ({
        ...r,
        services: Array.isArray(r.services) ? r.services[0] : r.services,
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

  const initialLetter = userName.charAt(0).toUpperCase();

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <p className="text-sm text-slate-500">Carregando…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F7FB] flex">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-slate-200 px-5 py-6 sticky top-0 h-screen">
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
          <button className={navButton(false)} onClick={() => router.push("/app")}>
            Dashboard
          </button>
          <button className={navButton(true)}>Agendamentos</button>
          <button className={navButton(false)} onClick={() => router.push("/app/services")}>
            Serviços
          </button>
          <button className={navButton(false)} onClick={() => router.push("/app/financeiro")}>
            Financeiro
          </button>
          <button className={navButton(false)} onClick={() => router.push("/app/relatorios")}>
            Relatórios
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">
              {initialLetter}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-900 truncate">{userName}</p>
              <p className="text-[11px] text-slate-500">Conta profissional</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-[11px] text-slate-500 hover:text-red-600"
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
            className="w-10 h-10 rounded-xl border border-slate-200 bg-white"
          >
            ☰
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold">Agendamentos</p>
            <p className="text-[11px] text-slate-500">Registre pagamentos</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-600"
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
              <button onClick={() => setMobileMenuOpen(false)}>✕</button>
            </div>

            <nav className="space-y-1">
              <button className={navButton(false)} onClick={() => router.push("/app")}>
                Dashboard
              </button>
              <button className={navButton(true)}>Agendamentos</button>
              <button className={navButton(false)} onClick={() => router.push("/app/services")}>
                Serviços
              </button>
              <button className={navButton(false)} onClick={() => router.push("/app/financeiro")}>
                Financeiro
              </button>
              <button className={navButton(false)} onClick={() => router.push("/app/relatorios")}>
                Relatórios
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 min-w-0">
        <div className="lg:hidden h-[73px]" />

        <motion.section
          className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* MOBILE CARDS */}
          <div className="space-y-4 lg:hidden">
            {rows.map((r) => {
              const total = Math.max(
                (r.price_cents ?? 0) - (r.discount_cents ?? 0),
                0
              );
              const paid = r.paid_cents ?? 0;
              const remaining = Math.max(total - paid, 0);

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex justify-between">
                    <p className="font-medium">{r.services?.name ?? "Serviço"}</p>
                    <span className={`text-xs px-2 py-1 rounded-full border ${statusBadge(r.status)}`}>
                      {statusLabel(r.status)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(r.starts_at).toLocaleString("pt-BR")}
                  </p>

                  <div className="mt-3">
                    <p className="font-medium">{r.client_name ?? "—"}</p>
                    <p className="text-xs text-slate-500">{r.client_phone ?? ""}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                    <div>
                      <p className="text-slate-500">Previsto</p>
                      <p className="font-medium">{brl(total)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Pago</p>
                      <p className="font-medium">{brl(paid)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">A receber</p>
                      <p className="font-medium">{brl(remaining)}</p>
                    </div>
                  </div>

                  <button className="w-full mt-4 border border-slate-200 rounded-xl py-2 text-sm">
                    Registrar pagamento
                  </button>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Serviço</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Previsto</th>
                  <th className="px-4 py-3 text-right">Pago</th>
                  <th className="px-4 py-3 text-right">A receber</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const total = Math.max(
                    (r.price_cents ?? 0) - (r.discount_cents ?? 0),
                    0
                  );
                  const paid = r.paid_cents ?? 0;

                  return (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="px-4 py-3">
                        {new Date(r.starts_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {r.services?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p>{r.client_name ?? "—"}</p>
                        <p className="text-xs text-slate-500">{r.client_phone ?? ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full border ${statusBadge(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{brl(total)}</td>
                      <td className="px-4 py-3 text-right">{brl(paid)}</td>
                      <td className="px-4 py-3 text-right">
                        {brl(Math.max(total - paid, 0))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
