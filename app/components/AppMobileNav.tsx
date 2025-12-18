"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  title: string; // "Dashboard", "Agendamentos", "Serviços"
  userName?: string | null;
  initialLetter?: string;
  onLogout: () => void;
};

function MenuIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AppMobileNav({
  title,
  userName,
  initialLetter = "M",
  onLogout,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function go(to: string) {
    setOpen(false);
    router.push(to);
  }

  // fecha com ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const isDashboard = pathname === "/app";
  const isAgendamentos = pathname?.startsWith("/app/agendamentos");
  const isServices = pathname?.startsWith("/app/services");

  return (
    <>
      {/* HEADER MOBILE (layout antigo) */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-4 border-b border-[#DDE3FF] bg-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
            className="h-10 w-10 rounded-xl border border-[#DDE3FF] bg-white flex items-center justify-center text-slate-800 hover:bg-[#0000FF]/5 transition"
          >
            <MenuIcon />
          </button>

          <div className="leading-tight">
            <p className="text-sm font-semibold text-[#000080]">Marcaí</p>
            <p className="text-[11px] text-slate-500">{title}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-3 py-1.5 rounded-lg border border-[#DDE3FF] bg-white text-xs text-slate-700 hover:bg-[#0000FF]/5 transition"
        >
          Sair
        </button>
      </header>

      {/* OVERLAY + DRAWER */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* overlay */}
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />

          {/* drawer */}
          <aside className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white border-r border-[#DDE3FF] px-5 py-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#000080] flex items-center justify-center text-white font-semibold text-lg">
                  M
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight text-slate-900">
                    Marcaí
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Painel do profissional
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
                className="h-10 w-10 rounded-xl border border-[#DDE3FF] bg-white flex items-center justify-center text-slate-800 hover:bg-[#0000FF]/5 transition"
              >
                <CloseIcon />
              </button>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => go("/app")}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition ${
                  isDashboard
                    ? "bg-[#0000FF]/5 text-[#000080] font-medium"
                    : "text-slate-700 hover:bg-[#0000FF]/5"
                }`}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isDashboard ? "bg-[#000080]" : "bg-[#0000FF]/40"
                  }`}
                />
                Dashboard
              </button>

              <button
                onClick={() => go("/app/agendamentos")}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition ${
                  isAgendamentos
                    ? "bg-[#0000FF]/5 text-[#000080] font-medium"
                    : "text-slate-700 hover:bg-[#0000FF]/5"
                }`}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isAgendamentos ? "bg-[#000080]" : "bg-[#0000FF]/40"
                  }`}
                />
                Agendamentos
              </button>

              <button
                onClick={() => go("/app/services")}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition ${
                  isServices
                    ? "bg-[#0000FF]/5 text-[#000080] font-medium"
                    : "text-slate-700 hover:bg-[#0000FF]/5"
                }`}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isServices ? "bg-[#000080]" : "bg-[#0000FF]/40"
                  }`}
                />
                Serviços
              </button>
            </nav>

            <div className="mt-6 pt-4 border-t border-[#DDE3FF] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#000080] text-white flex items-center justify-center text-sm font-semibold">
                  {initialLetter}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-900 truncate max-w-[160px]">
                    {userName || "Conta profissional"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Conta profissional
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="text-[11px] text-slate-500 hover:text-red-600 transition"
              >
                Sair
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
