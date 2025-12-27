// app/agenda/[slug]/page.tsx
"use client";

import { use, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const APPT_TABLE = "appointments";
const APPT_USER_COL = "user_id";
const APPT_SERVICE_COL = "service_id";
const APPT_CLIENT_NAME_COL = "client_name";
const APPT_CLIENT_PHONE_COL = "client_phone";
const APPT_DATE_COL = "date";
const APPT_TIME_COL = "time";
const APPT_STARTS_AT_COL = "starts_at";
const APPT_ENDS_AT_COL = "ends_at";
const APPT_STATUS_COL = "status";
const APPT_PRICE_COL = "price_cents";

type Profile = {
  id: string;
  name: string;
  slug: string;
  company_name: string | null; // ✅ NOVO
};

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number | null;
};

type AppointmentRow = Record<string, any>;

function normalizeTime(t: string) {
  if (!t) return t;
  const p = t.split(":");
  return p.length >= 2 ? `${p[0].padStart(2, "0")}:${p[1].padStart(2, "0")}` : t;
}

function friendlyDatePtBR(ymd: string) {
  if (!ymd) return "";
  return new Date(ymd).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

function looksLikeUniqueViolation(err: any) {
  const code = String(err?.code ?? "");
  const msg = String(err?.message ?? "").toLowerCase();
  return code === "23505" || msg.includes("duplicate") || msg.includes("unique");
}

function dumpSupabaseError(tag: string, err: any) {
  console.error(tag, {
    message: err?.message,
    code: (err as any)?.code,
    details: (err as any)?.details,
    hint: (err as any)?.hint,
  });
}

function buildDateLocal(dateYmd: string, timeHHmm: string) {
  const [y, m, d] = dateYmd.split("-").map((n) => Number(n));
  const [hh, mm] = timeHHmm.split(":").map((n) => Number(n));
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

export default function PublicAgendaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState("");

  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ✅ helper para exibir nome público (empresa > nome pessoal > fallback)
  const publicDisplayName =
    profile?.company_name?.trim() || profile?.name?.trim() || "Profissional";

  // 1) Carrega profile + services (✅ agora traz company_name)
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      const { data: prof, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, slug, company_name") // ✅
        .eq("slug", slug)
        .maybeSingle();

      if (!alive) return;

      if (profileError || !prof) {
        setProfile(null);
        setServices([]);
        setLoading(false);
        if (profileError) dumpSupabaseError("[load profile] error", profileError);
        return;
      }

      setProfile(prof as Profile);

      const { data: serv, error: servicesError } = await supabase
        .from("services")
        .select("id, name, duration_minutes, price_cents")
        .eq("user_id", prof.id)
        .eq("active", true)
        .order("name");

      if (!alive) return;

      if (servicesError) dumpSupabaseError("[load services] error", servicesError);
      setServices(servicesError ? [] : ((serv as any) ?? []));
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [slug, supabase]);

  // 2) Gera slots
  useEffect(() => {
    if (!selectedService) {
      setTimeSlots([]);
      setSelectedTime(null);
      return;
    }

    const service = services.find((s) => s.id === selectedService);
    if (!service) {
      setTimeSlots([]);
      setSelectedTime(null);
      return;
    }

    const startHour = 8;
    const endHour = 18;
    const step = service.duration_minutes <= 30 ? 30 : 60;

    const times: string[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
      const hh = String(hour).padStart(2, "0");
      times.push(`${hh}:00`);
      if (step === 30) times.push(`${hh}:30`);
    }

    setTimeSlots(times);
    setSelectedTime(null);
  }, [selectedService, services]);

  // 3) Busca horários reservados por date/time
  useEffect(() => {
    let alive = true;

    async function loadBooked() {
      setBookedTimes([]);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!profile?.id || !selectedService || !selectedDate) return;

      const { data, error } = await supabase
        .from(APPT_TABLE)
        .select(APPT_TIME_COL)
        .eq(APPT_USER_COL, profile.id)
        .eq(APPT_SERVICE_COL, selectedService)
        .eq(APPT_DATE_COL, selectedDate);

      if (!alive) return;

      if (error) {
        dumpSupabaseError("[loadBooked] error", error);
        setBookedTimes([]);
        return;
      }

      const rows = (data ?? []) as AppointmentRow[];
      const blocked = rows
        .map((r) => normalizeTime(String(r?.[APPT_TIME_COL] ?? "")))
        .filter((t) => t && t.includes(":"));

      setBookedTimes(blocked);
      setSelectedTime((prev) => (prev && blocked.includes(prev) ? null : prev));
    }

    loadBooked();
    return () => {
      alive = false;
    };
  }, [profile?.id, selectedService, selectedDate, supabase]);

  const initialLetter = publicDisplayName.trim().charAt(0).toUpperCase() ?? "M";
  const friendlyDate = friendlyDatePtBR(selectedDate);

  const selectedServiceObj = selectedService
    ? services.find((s) => s.id === selectedService)
    : null;

  const canConfirm =
    Boolean(selectedService && selectedTime) &&
    clientName.trim().length >= 2 &&
    clientPhone.trim().length >= 8 &&
    !submitting;

  async function handleConfirm() {
    if (!profile?.id || !selectedService || !selectedTime) return;

    const service = services.find((s) => s.id === selectedService);
    if (!service) {
      setErrorMessage("Selecione um serviço válido.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const date = selectedDate;
    const time = normalizeTime(selectedTime);

    if (bookedTimes.includes(time)) {
      setSubmitting(false);
      setSelectedTime(null);
      setErrorMessage("Esse horário acabou de ser reservado. Selecione outro.");
      return;
    }

    const startsLocal = buildDateLocal(date, time);
    const endsLocal = new Date(startsLocal.getTime() + service.duration_minutes * 60 * 1000);

    const payload: Record<string, any> = {
      [APPT_USER_COL]: profile.id,
      [APPT_SERVICE_COL]: selectedService,
      [APPT_CLIENT_NAME_COL]: clientName.trim(),
      [APPT_CLIENT_PHONE_COL]: clientPhone.trim(),

      [APPT_DATE_COL]: date,
      [APPT_TIME_COL]: time,

      [APPT_STARTS_AT_COL]: startsLocal.toISOString(),
      [APPT_ENDS_AT_COL]: endsLocal.toISOString(),

      [APPT_PRICE_COL]: service.price_cents ?? 0,
      [APPT_STATUS_COL]: "scheduled",
    };

    const { error } = await supabase.from(APPT_TABLE).insert(payload).select("id").single();

    if (error) {
      dumpSupabaseError("[handleConfirm] error", error);

      if (looksLikeUniqueViolation(error)) {
        setErrorMessage("Esse horário acabou de ser reservado. Escolha outro.");
      } else {
        setErrorMessage("Não foi possível confirmar o agendamento.");
      }

      setSubmitting(false);
      return;
    }

    setBookedTimes((prev) => [...prev, time]);
    setSuccessMessage("Horário reservado! ✅");
    setSubmitting(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Carregando agenda…</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F6F7FB] px-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-md w-full text-center">
          <p className="text-sm font-semibold text-slate-900">Agenda não encontrada</p>
          <p className="text-xs text-slate-500 mt-2">Verifique se o link está correto.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F7FB]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-[#F6F7FB]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-semibold text-lg">
              {initialLetter}
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900">
                {publicDisplayName}
              </p>
              <p className="text-[11px] text-slate-500">
                Agendamento online
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded-full">
              Horários em tempo real
            </span>
          </div>
        </div>
      </header>

      <motion.section
        className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Top info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-900">Agende um horário</p>
          <p className="text-xs text-slate-500 mt-1">
            Escolha o serviço, a data e o melhor horário para você.
          </p>

          {errorMessage && <p className="text-xs text-red-600 mt-3">{errorMessage}</p>}
          {successMessage && <p className="text-xs text-emerald-700 mt-3">{successMessage}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left */}
          <div className="lg:col-span-2 space-y-4">
            {/* Serviço + Data */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Escolha</p>
                <p className="text-xs text-slate-500">Serviço e data</p>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Serviço</label>
                  <select
                    className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                  >
                    <option value="">
                      {services.length === 0 ? "Nenhum serviço disponível" : "Selecione um serviço"}
                    </option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.duration_minutes} min
                        {typeof s.price_cents === "number"
                          ? ` — R$ ${(s.price_cents / 100).toFixed(2)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">Data</label>
                  <input
                    type="date"
                    className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-500 mt-2">
                    {friendlyDate && `Você está vendo os horários de ${friendlyDate}.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Horários */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Horários</p>
                  <p className="text-xs text-slate-500">Selecione um horário disponível</p>
                </div>
              </div>

              <div className="mt-4">
                {!selectedService && (
                  <p className="text-sm text-slate-600">
                    Primeiro selecione um serviço para ver os horários disponíveis.
                  </p>
                )}

                {selectedService && timeSlots.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {timeSlots.map((time) => {
                      const isBooked = bookedTimes.includes(time);
                      const isSelected = selectedTime === time && !isBooked;

                      return (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          key={time}
                          disabled={isBooked}
                          onClick={() => !isBooked && setSelectedTime(time)}
                          className={`px-3 py-2 rounded-xl text-sm border transition ${
                            isBooked
                              ? "bg-red-50 border-red-200 text-red-700 cursor-not-allowed"
                              : isSelected
                              ? "bg-slate-900 border-slate-200600 text-white shadow-sm"
                              : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          {time}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {selectedService && bookedTimes.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-3">
                    Horários em vermelho já estão reservados.
                  </p>
                )}
              </div>
            </div>

            {/* Seus dados */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Seus dados</p>
                <p className="text-xs text-slate-500">Para o profissional confirmar com você</p>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Seu nome</label>
                  <input
                    className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Gustavo"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">Seu WhatsApp</label>
                  <input
                    className="mt-1 w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                  {initialLetter}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {publicDisplayName}
                  </p>
                  <p className="text-[11px] text-slate-500">Agenda pública</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Serviço</span>
                  <span className="text-slate-900 font-medium text-right">
                    {selectedServiceObj?.name ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Data</span>
                  <span className="text-slate-900 font-medium text-right">{friendlyDate || "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Horário</span>
                  <span className="text-slate-900 font-medium text-right">{selectedTime ?? "—"}</span>
                </div>
              </div>

              <button
                disabled={!canConfirm}
                onClick={handleConfirm}
                className="mt-4 w-full px-3 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition"
              >
                {submitting ? "Confirmando..." : "Confirmar horário"}
              </button>

              <p className="text-[11px] text-slate-500 text-center mt-3">
                Nenhum valor é cobrado aqui.
              </p>
            </div>
          </div>
        </div>
      </motion.section>
    </main>
  );
}
