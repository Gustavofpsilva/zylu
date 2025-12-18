"use client";

import { use, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from "@react-pdf/renderer";

type MonthlyClosingRow = {
  id: string;
  user_id: string;
  month_start: string; // date
  period_start: string; // timestamptz
  period_end: string; // timestamptz
  appointments_count: number;
  previsto_cents: number;
  pago_cents: number;
  areceber_cents: number;
  created_at: string;
  updated_at: string;
};

function formatBRLFromCents(cents: number) {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthLabelPtBR(monthStartISO: string) {
  const d = new Date(monthStartISO);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function formatDateTimePtBR(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// CSV export baseado no snapshot
function csvEscape(value: string) {
  const v = value ?? "";
  const needsQuotes = /[;\n",]/.test(v);
  const escaped = v.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8"
) {
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

function exportClosingCsv(row: MonthlyClosingRow) {
  const filename = `marcai_fechamento_${ymd(new Date(row.month_start))}.csv`;

  const header = [
    "Mes",
    "MonthStart",
    "PeriodStart",
    "PeriodEnd",
    "Atendimentos",
    "PrevistoCentavos",
    "PagoCentavos",
    "AReceberCentavos",
    "PrevistoBRL",
    "PagoBRL",
    "AReceberBRL",
    "CriadoEm",
    "AtualizadoEm",
  ];

  const values = [
    monthLabelPtBR(row.month_start),
    row.month_start,
    row.period_start,
    row.period_end,
    String(row.appointments_count ?? 0),
    String(row.previsto_cents ?? 0),
    String(row.pago_cents ?? 0),
    String(row.areceber_cents ?? 0),
    formatBRLFromCents(row.previsto_cents ?? 0),
    formatBRLFromCents(row.pago_cents ?? 0),
    formatBRLFromCents(row.areceber_cents ?? 0),
    row.created_at,
    row.updated_at,
  ];

  const csv = [header.join(";"), values.map((v) => csvEscape(String(v))).join(";")].join("\n");
  downloadTextFile(filename, csv);
}

/**
 * PDF “nota/relatório” (React-PDF)
 */
const pdfStyles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 11,
    color: "#0f172a",
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: { fontSize: 16, fontWeight: 700 },
  subtitle: { marginTop: 4, color: "#475569" },
  pill: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 10,
    color: "#334155",
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  metaLabel: { color: "#64748b" },
  metaValue: { fontWeight: 700 },

  grid: { flexDirection: "row", gap: 10, marginTop: 12 },
  kpi: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 10,
  },
  kpiLabel: { color: "#64748b", fontSize: 10 },
  kpiValue: { marginTop: 6, fontSize: 14, fontWeight: 700 },

  footer: {
    marginTop: 14,
    color: "#64748b",
    fontSize: 9,
  },
});

function ClosingPdfDoc(props: {
  closing: MonthlyClosingRow;
  displayName: string;
  publicUrl?: string;
}) {
  const c = props.closing;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <View style={pdfStyles.brandRow}>
            <View>
              <Text style={pdfStyles.title}>{props.displayName}</Text>
              <Text style={pdfStyles.subtitle}>
                Fechamento mensal — {monthLabelPtBR(c.month_start)}
              </Text>
              {props.publicUrl ? (
                <Text style={{ ...pdfStyles.subtitle, marginTop: 3 }}>
                  Agenda: {props.publicUrl}
                </Text>
              ) : null}
            </View>
            <Text style={pdfStyles.pill}>Relatório / Snapshot</Text>
          </View>
        </View>

        <View style={pdfStyles.card}>
          <Text style={pdfStyles.sectionTitle}>Resumo do período</Text>

          <View style={pdfStyles.metaRow}>
            <Text style={pdfStyles.metaLabel}>Mês</Text>
            <Text style={pdfStyles.metaValue}>{monthLabelPtBR(c.month_start)}</Text>
          </View>

          <View style={pdfStyles.metaRow}>
            <Text style={pdfStyles.metaLabel}>Período</Text>
            <Text style={pdfStyles.metaValue}>
              {formatDateTimePtBR(c.period_start)} → {formatDateTimePtBR(c.period_end)}
            </Text>
          </View>

          <View style={pdfStyles.metaRow}>
            <Text style={pdfStyles.metaLabel}>Atendimentos</Text>
            <Text style={pdfStyles.metaValue}>{String(c.appointments_count ?? 0)}</Text>
          </View>

          <View style={pdfStyles.grid}>
            <View style={pdfStyles.kpi}>
              <Text style={pdfStyles.kpiLabel}>Previsto</Text>
              <Text style={pdfStyles.kpiValue}>{formatBRLFromCents(c.previsto_cents ?? 0)}</Text>
              <Text style={{ color: "#64748b", fontSize: 9, marginTop: 3 }}>
                {(c.previsto_cents ?? 0)} centavos
              </Text>
            </View>

            <View style={pdfStyles.kpi}>
              <Text style={pdfStyles.kpiLabel}>Pago</Text>
              <Text style={pdfStyles.kpiValue}>{formatBRLFromCents(c.pago_cents ?? 0)}</Text>
              <Text style={{ color: "#64748b", fontSize: 9, marginTop: 3 }}>
                {(c.pago_cents ?? 0)} centavos
              </Text>
            </View>

            <View style={pdfStyles.kpi}>
              <Text style={pdfStyles.kpiLabel}>A receber</Text>
              <Text style={pdfStyles.kpiValue}>{formatBRLFromCents(c.areceber_cents ?? 0)}</Text>
              <Text style={{ color: "#64748b", fontSize: 9, marginTop: 3 }}>
                {(c.areceber_cents ?? 0)} centavos
              </Text>
            </View>
          </View>

          <Text style={pdfStyles.footer}>
            Criado em: {formatDateTimePtBR(c.created_at)} • Atualizado em: {formatDateTimePtBR(c.updated_at)}
          </Text>
          <Text style={pdfStyles.footer}>
            Este relatório é baseado em snapshot (fechamento salvo), não no mês “ao vivo”.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export default function ClosingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("Marcaí");
  const [userSlug, setUserSlug] = useState<string | null>(null);

  const [closing, setClosing] = useState<MonthlyClosingRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr(null);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // pega nome/slug (pra mostrar e usar no PDF)
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, slug, company_name")
        .eq("id", user.id)
        .maybeSingle();

      const displayName =
        (profile as any)?.company_name?.trim() ||
        profile?.name ||
        user.email ||
        "Marcaí";

      if (!alive) return;
      setUserName(displayName);
      setUserSlug(profile?.slug || null);

      // carrega fechamento pelo id (RLS deve garantir acesso)
      const { data, error } = await supabase
        .from("monthly_closings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!alive) return;

      if (error || !data) {
        setClosing(null);
        setErr("Fechamento não encontrado (ou você não tem acesso).");
        setLoading(false);
        return;
      }

      setClosing(data as any);
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [id, router, supabase]);

  const publicUrl =
    userSlug
      ? `${process.env.NEXT_PUBLIC_SITE_URL || "https://marcai.com.br"}/agenda/${userSlug}`
      : undefined;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Carregando fechamento…</p>
      </main>
    );
  }

  if (!closing) {
    return (
      <main className="min-h-screen bg-[#F6F7FB] px-6 py-10">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-sm font-semibold text-slate-900">Não foi possível abrir</p>
          <p className="text-xs text-slate-600 mt-2">{err ?? "Tente novamente."}</p>
          <button
            onClick={() => router.push("/app")}
            className="mt-4 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Voltar para dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F7FB]">
      <header className="border-b border-slate-200 bg-[#F6F7FB]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/app")}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white"
              aria-label="Voltar"
              type="button"
            >
              ←
            </button>

            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900">
                Fechamento — {monthLabelPtBR(closing.month_start)}
              </p>
              <p className="text-[11px] text-slate-500">
                Snapshot salvo • {userName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportClosingCsv(closing)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
            >
              Exportar CSV
            </button>

            <PDFDownloadLink
              document={
                <ClosingPdfDoc
                  closing={closing}
                  displayName={userName}
                  publicUrl={publicUrl}
                />
              }
              fileName={`marcai_fechamento_${ymd(new Date(closing.month_start))}.pdf`}
              style={{ textDecoration: "none" }}
            >
              {({ loading: pdfLoading }) => (
                <button
                  className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={pdfLoading}
                >
                  {pdfLoading ? "Gerando PDF..." : "Baixar PDF"}
                </button>
              )}
            </PDFDownloadLink>
          </div>
        </div>
      </header>

      <motion.section
        className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-900">Resumo do fechamento</p>
          <p className="text-xs text-slate-500 mt-1">
            Período: {formatDateTimePtBR(closing.period_start)} → {formatDateTimePtBR(closing.period_end)}
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Previsto</p>
              <p className="text-xl font-semibold text-slate-900 mt-1">
                {formatBRLFromCents(closing.previsto_cents ?? 0)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {(closing.previsto_cents ?? 0)} centavos
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Pago</p>
              <p className="text-xl font-semibold text-slate-900 mt-1">
                {formatBRLFromCents(closing.pago_cents ?? 0)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {(closing.pago_cents ?? 0)} centavos
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">A receber</p>
              <p className="text-xl font-semibold text-slate-900 mt-1">
                {formatBRLFromCents(closing.areceber_cents ?? 0)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {(closing.areceber_cents ?? 0)} centavos
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-600">
              Atendimentos no mês:{" "}
              <span className="font-semibold text-slate-900">
                {closing.appointments_count ?? 0}
              </span>
            </p>
            <p className="text-[11px] text-slate-500">
              Atualizado em {formatDateTimePtBR(closing.updated_at)}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-2xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-900">O que este fechamento garante</p>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Este relatório é um snapshot. Mesmo que você edite atendimentos antigos depois,
            o fechamento continua igual (útil para contabilidade e conferência).
          </p>
        </div>
      </motion.section>
    </main>
  );
}
